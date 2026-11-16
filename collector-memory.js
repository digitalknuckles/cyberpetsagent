// Persistent collector profiles. All queries are parameterized and wallet-scoped.
export function createCollectorStore(pg, connectionString) {
  if (!connectionString) console.warn('DATABASE_URL required for collector memory');
  const pool = connectionString ? new pg.Pool({ connectionString, max: 3, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: true } }) : null;
  let initialized;
  async function ready() {
    if (!pool) throw new Error('DATABASE_URL is not configured');
    if (!initialized) initialized = pool.query(`
      CREATE TABLE IF NOT EXISTS collector_profiles (
        address TEXT PRIMARY KEY, first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen TIMESTAMPTZ NOT NULL DEFAULT now(), active_token_id TEXT,
        tokens JSONB NOT NULL DEFAULT '[]'::jsonb
      );
      CREATE TABLE IF NOT EXISTS collector_challenges (
        address TEXT PRIMARY KEY, nonce_hash TEXT NOT NULL, message TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collector_sessions (
        session_hash TEXT PRIMARY KEY, address TEXT NOT NULL REFERENCES collector_profiles(address),
        last_active TIMESTAMPTZ NOT NULL DEFAULT now(), history JSONB NOT NULL DEFAULT '[]'::jsonb, nfts JSONB NOT NULL DEFAULT '[]'::jsonb
      );
      CREATE TABLE IF NOT EXISTS collector_activities (
        id BIGSERIAL PRIMARY KEY, address TEXT NOT NULL REFERENCES collector_profiles(address),
        token_id TEXT NOT NULL, direction TEXT NOT NULL, detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        acknowledged_at TIMESTAMPTZ,
        UNIQUE(address, token_id, direction, detected_at)
      );
      CREATE TABLE IF NOT EXISTS collector_ai_memory (
        address TEXT PRIMARY KEY REFERENCES collector_profiles(address) ON DELETE CASCADE,
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        notes JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS collector_activities_pending ON collector_activities(address, acknowledged_at);
    `).catch(e => { initialized = null; throw e; });
    await initialized;
  }
  return {
    async challenge(address, nonceHash, expires, message) {
      await ready();
      await pool.query(`INSERT INTO collector_challenges(address,nonce_hash,message,expires_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(address) DO UPDATE SET nonce_hash=$2,message=$3,expires_at=$4`, [address,nonceHash,message,expires]);
    },
    async consumeChallenge(address, nonceHash) {
      await ready();
      const { rows } = await pool.query(`DELETE FROM collector_challenges WHERE address=$1 AND nonce_hash=$2 AND expires_at>now() RETURNING message`,[address,nonceHash]);
      return rows[0];
    },
    async syncCollector(address, nfts) {
      await ready();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize logins for this wallet, including first-time login.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[address]);
        const { rows } = await client.query('SELECT * FROM collector_profiles WHERE address=$1 FOR UPDATE',[address]);
        const old = rows[0];
        const tokens = [...new Set(nfts.map(n => String(n.tokenId)))];
        const oldTokens = old?.tokens || [];
        if (old) {
          for (const tokenId of tokens.filter(id => !oldTokens.includes(id)))
            await client.query(`INSERT INTO collector_activities(address,token_id,direction) VALUES($1,$2,'received')`,[address,tokenId]);
          for (const tokenId of oldTokens.filter(id => !tokens.includes(id)))
            await client.query(`INSERT INTO collector_activities(address,token_id,direction) VALUES($1,$2,'sent')`,[address,tokenId]);
        }
        const active = tokens.includes(old?.active_token_id) ? old.active_token_id : tokens[0] || null;
        await client.query(`INSERT INTO collector_profiles(address,tokens,active_token_id) VALUES($1,$2,$3)
          ON CONFLICT(address) DO UPDATE SET tokens=$2,active_token_id=$3,last_seen=now()`,[address,JSON.stringify(tokens),active]);
        const activities = await client.query(`SELECT id,token_id AS "tokenId",direction,detected_at AS "detectedAt"
          FROM collector_activities WHERE address=$1 AND acknowledged_at IS NULL ORDER BY id ASC LIMIT 100`,[address]);
        await client.query('COMMIT');
        return { returning: !!old, activeTokenId: active, activities: activities.rows.map(a => ({ ...a, id: Number(a.id) })) };
      } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    },
    async createSession(hash,address,nfts) { await ready(); await pool.query('INSERT INTO collector_sessions(session_hash,address,nfts) VALUES($1,$2,$3)',[hash,address,JSON.stringify(nfts)]); },
    async session(hash, inactivityMs) {
      await ready();
      const {rows} = await pool.query(`UPDATE collector_sessions SET last_active=now()
        WHERE session_hash=$1 AND last_active>now()-($2::bigint * interval '1 millisecond')
        RETURNING address,history,nfts`,[hash,inactivityMs]);
      if (!rows.length) return null;
      const profile = await pool.query('SELECT active_token_id FROM collector_profiles WHERE address=$1',[rows[0].address]);
      if (!profile.rows.length) return null;
      // NFT holdings are revalidated at sign-in; sessions carry the last verified snapshot.
      const snapshot = await pool.query('SELECT tokens FROM collector_profiles WHERE address=$1',[rows[0].address]);
      const tokens = snapshot.rows[0]?.tokens || [];
      return { address: rows[0].address, sessionHash: hash, activeTokenId: profile.rows[0].active_token_id,
        nfts: (rows[0].nfts || []).filter(n => tokens.includes(String(n.tokenId))), history: rows[0].history || [] };
    },
    async setActive(address,tokenId) { await ready(); await pool.query(`UPDATE collector_profiles SET active_token_id=$2 WHERE address=$1 AND tokens ? $2`,[address,tokenId]); },
    async saveHistory(hash,history) { await ready(); await pool.query('UPDATE collector_sessions SET history=$2 WHERE session_hash=$1',[hash,JSON.stringify(history)]); },
    async acknowledge(address,ids) { await ready(); await pool.query('UPDATE collector_activities SET acknowledged_at=now() WHERE address=$1 AND id=ANY($2::bigint[]) AND acknowledged_at IS NULL',[address,ids]); },
    async getMemory(address) {
      await ready();
      const {rows}=await pool.query('SELECT enabled,notes FROM collector_ai_memory WHERE address=$1',[address]);
      return rows[0] || {enabled:false,notes:[]};
    },
    async setMemoryEnabled(address,enabled) {
      await ready();
      await pool.query(`INSERT INTO collector_ai_memory(address,enabled) VALUES($1,$2)
        ON CONFLICT(address) DO UPDATE SET enabled=$2,updated_at=now()`,[address,enabled]);
    },
    async addMemory(address,note) {
      await ready();
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO collector_ai_memory(address,enabled) VALUES($1,true) ON CONFLICT(address) DO NOTHING`,[address]);
        const {rows}=await client.query('SELECT enabled,notes FROM collector_ai_memory WHERE address=$1 FOR UPDATE',[address]);
        if(!rows[0].enabled){await client.query('ROLLBACK');return false;}
        const notes=[...rows[0].notes.filter(n=>n!==note),note].slice(-8);
        await client.query('UPDATE collector_ai_memory SET notes=$2,updated_at=now() WHERE address=$1',[address,JSON.stringify(notes)]);
        await client.query('COMMIT');return true;
      } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
    },
    async clearMemory(address) {
      await ready();await pool.query(`UPDATE collector_ai_memory SET notes='[]'::jsonb,updated_at=now() WHERE address=$1`,[address]);
    },
    async deleteSession(hash) { await ready(); await pool.query('DELETE FROM collector_sessions WHERE session_hash=$1',[hash]); }
  };
}
