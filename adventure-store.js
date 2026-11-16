// Wallet-scoped, NFT-linked adventure saves. Existing collector database is reused.
export function createAdventureStore(pg, connectionString) {
  // Initialize lazily: a missing database must not crash the entire Express function.
  const pool = connectionString ? new pg.Pool({connectionString, max:3, ssl: /(?:localhost|127\.0\.0\.1)/.test(connectionString) ? false : {rejectUnauthorized:true}}) : null;
  let readyPromise;
  const ready=()=>{
    if (!pool) throw new Error('DATABASE_URL is not configured');
    return readyPromise ||= pool.query(`
    CREATE TABLE IF NOT EXISTS collector_adventures (
      id UUID PRIMARY KEY, address TEXT NOT NULL REFERENCES collector_profiles(address),
      chain_id INTEGER NOT NULL DEFAULT 137, contract TEXT NOT NULL, token_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'The Forgotten Scrapyard',
      state JSONB NOT NULL, recent JSONB NOT NULL DEFAULT '[]'::jsonb,
      save_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      revision INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS collector_adventures_wallet ON collector_adventures(address,updated_at DESC);
    CREATE TABLE IF NOT EXISTS adventure_checkpoints (
      id UUID PRIMARY KEY, adventure_id UUID NOT NULL REFERENCES collector_adventures(id) ON DELETE CASCADE,
      address TEXT NOT NULL REFERENCES collector_profiles(address),
      label TEXT NOT NULL, state JSONB NOT NULL, recent JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `).catch(e=>{readyPromise=null;throw e;});
  };
  return {
    async list(address){await ready();const {rows}=await pool.query('SELECT id,token_id AS "tokenId",title,save_enabled AS "saveEnabled",updated_at AS "updatedAt" FROM collector_adventures WHERE address=$1 ORDER BY updated_at DESC LIMIT 30',[address]);return rows;},
    async get(address,id){await ready();const {rows}=await pool.query('SELECT * FROM collector_adventures WHERE address=$1 AND id=$2',[address,id]);return rows[0];},
    async create(address,id,contract,tokenId,state){await ready();const {rows}=await pool.query('INSERT INTO collector_adventures(id,address,contract,token_id,state) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,address,contract,tokenId,JSON.stringify(state)]);return rows[0];},
    async update(address,id,revision,state,recent){await ready();const {rows}=await pool.query('UPDATE collector_adventures SET state=$4,recent=$5,revision=revision+1,updated_at=now() WHERE address=$1 AND id=$2 AND revision=$3 RETURNING revision',[address,id,revision,JSON.stringify(state),JSON.stringify(recent)]);return rows[0]||null;},
    async checkpoint(address,id,checkpointId,label){await ready();const {rows}=await pool.query(`INSERT INTO adventure_checkpoints(id,adventure_id,address,label,state,recent) SELECT $3,id,address,$4,state,recent FROM collector_adventures WHERE address=$1 AND id=$2 RETURNING id,label,created_at AS "createdAt"`,[address,id,checkpointId,label]);return rows[0];},
    async checkpoints(address,id){await ready();const {rows}=await pool.query('SELECT id,label,created_at AS "createdAt" FROM adventure_checkpoints WHERE address=$1 AND adventure_id=$2 ORDER BY created_at DESC LIMIT 20',[address,id]);return rows;},
    async loadCheckpoint(address,id,checkpointId,revision){await ready();const client=await pool.connect();try{await client.query('BEGIN');const {rows}=await client.query('SELECT state,recent FROM adventure_checkpoints WHERE address=$1 AND adventure_id=$2 AND id=$3',[address,id,checkpointId]);if(!rows.length){await client.query('ROLLBACK');return null;}const changed=await client.query('UPDATE collector_adventures SET state=$4,recent=$5,revision=revision+1,updated_at=now() WHERE address=$1 AND id=$2 AND revision=$3 RETURNING revision',[address,id,revision,JSON.stringify(rows[0].state),JSON.stringify(rows[0].recent)]);if(!changed.rows.length){await client.query('ROLLBACK');return null;}await client.query('COMMIT');return {...rows[0],revision:changed.rows[0].revision};}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}},
    async remove(address,id){await ready();await pool.query('DELETE FROM collector_adventures WHERE address=$1 AND id=$2',[address,id]);}
  };
}
