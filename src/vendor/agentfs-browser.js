/* esm.sh - agentfs-sdk@0.5.2 (vendored for ClawdOS) */
import { Buffer as __Buffer$ } from "./buffer.js";
var D=class{db;kv;fs;tools;constructor(t,a,e,n){this.db=t,this.kv=a,this.fs=e,this.tools=n}getDatabase(){return this.db}async close(){await this.db.close()}};var N=class r{db;constructor(t){this.db=t}static async fromDatabase(t){let a=new r(t);return await a.initialize(),a}async initialize(){await this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `),await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_kv_store_created_at
      ON kv_store(created_at)
    `)}async set(t,a){let e=JSON.stringify(a);await this.db.prepare(`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = unixepoch()
    `).run(t,e)}async get(t){let e=await this.db.prepare("SELECT value FROM kv_store WHERE key = ?").get(t);if(e)return JSON.parse(e.value)}async list(t){let a=this.db.prepare("SELECT key, value FROM kv_store WHERE key LIKE ? ESCAPE '\\'"),e=t.replace("\\","\\\\").replace("%","\\%").replace("_","\\_");return(await a.all(e+"%")).map(s=>({key:s.key,value:JSON.parse(s.value)}))}async delete(t){await this.db.prepare("DELETE FROM kv_store WHERE key = ?").run(t)}};function _(r){return{...r,isFile:()=>(r.mode&61440)===32768,isDirectory:()=>(r.mode&61440)===16384,isSymbolicLink:()=>(r.mode&61440)===40960}}function c(r){let{code:t,syscall:a,path:e,message:n}=r,s=n??t,i=e!==void 0?` '${e}'`:"",o=new Error(`${t}: ${s}, ${a}${i}`);return o.code=t,o.syscall=a,e!==void 0&&(o.path=e),o}async function b(r,t){return(await r.prepare("SELECT mode FROM fs_inode WHERE ino = ?").get(t))?.mode??null}function L(r){return(r&61440)===16384}async function S(r,t,a,e){let n=await b(r,t);if(n===null)throw c({code:"ENOENT",syscall:a,path:e,message:"no such file or directory"});return n}function R(r,t){if(r==="/")throw c({code:"EPERM",syscall:t,path:r,message:"operation not permitted on root directory"})}function U(r){return{force:r?.force===!0,recursive:r?.recursive===!0}}function v(r,t,a){if(!a)throw c({code:"ENOENT",syscall:t,path:r,message:"no such file or directory"})}function f(r,t,a){if((r&61440)===40960)throw c({code:"ENOSYS",syscall:t,path:a,message:"symbolic links not supported yet"})}async function W(r,t,a,e){let n=await b(r,t);if(n===null)throw c({code:"ENOENT",syscall:a,path:e,message:"no such file or directory"});if(L(n))throw c({code:"EISDIR",syscall:a,path:e,message:"illegal operation on a directory"});f(n,a,e)}async function w(r,t,a,e){let n=await b(r,t);if(n===null)throw c({code:"ENOENT",syscall:a,path:e,message:"no such file or directory"});if(!L(n))throw c({code:"ENOTDIR",syscall:a,path:e,message:"not a directory"})}async function H(r,t,a,e){await W(r,t,a,e)}async function k(r,t,a,e){await W(r,t,a,e)}async function F(r,t,a){let e="scandir",n=await b(r,t);if(n===null)throw c({code:"ENOENT",syscall:e,path:a,message:"no such file or directory"});if(f(n,e,a),!L(n))throw c({code:"ENOTDIR",syscall:e,path:a,message:"not a directory"})}async function G(r,t,a){let e="unlink",n=await b(r,t);if(n===null)throw c({code:"ENOENT",syscall:e,path:a,message:"no such file or directory"});if(L(n))throw c({code:"EISDIR",syscall:e,path:a,message:"illegal operation on a directory"});f(n,e,a)}var M=4096,P=class{db;bufferCtor;ino;chunkSize;constructor(t,a,e,n){this.db=t,this.bufferCtor=a,this.ino=e,this.chunkSize=n}async pread(t,a){let e=Math.floor(t/this.chunkSize),n=Math.floor((t+a-1)/this.chunkSize),i=await this.db.prepare(`
      SELECT chunk_index, data FROM fs_data
      WHERE ino = ? AND chunk_index >= ? AND chunk_index <= ?
      ORDER BY chunk_index ASC
    `).all(this.ino,e,n),o=[],d=0,l=t%this.chunkSize;for(let E of i){let h=o.length===0?l:0;if(h>=E.data.length)continue;let u=a-d,m=Math.min(E.data.length-h,u);o.push(E.data.subarray(h,h+m)),d+=m}return o.length===0?this.bufferCtor.alloc(0):this.bufferCtor.concat(o)}async pwrite(t,a){if(a.length===0)return;let s=(await this.db.prepare("SELECT size FROM fs_inode WHERE ino = ?").get(this.ino))?.size??0;if(t>s){let l=this.bufferCtor.alloc(t-s);await this.writeDataAtOffset(s,l)}await this.writeDataAtOffset(t,a);let i=Math.max(s,t+a.length),o=Math.floor(Date.now()/1e3);await this.db.prepare("UPDATE fs_inode SET size = ?, mtime = ? WHERE ino = ?").run(i,o,this.ino)}async writeDataAtOffset(t,a){let e=Math.floor(t/this.chunkSize),n=Math.floor((t+a.length-1)/this.chunkSize);for(let s=e;s<=n;s++){let i=s*this.chunkSize,o=i+this.chunkSize,d=Math.max(0,i-t),l=Math.min(a.length,o-t),E=Math.max(0,t-i),u=await this.db.prepare("SELECT data FROM fs_data WHERE ino = ? AND chunk_index = ?").get(this.ino,s),m;if(u){if(m=this.bufferCtor.from(u.data),E+(l-d)>m.length){let y=this.bufferCtor.alloc(E+(l-d));m.copy(y),m=y}}else m=this.bufferCtor.alloc(E+(l-d));a.copy(m,E,d,l),await this.db.prepare(`
        INSERT INTO fs_data (ino, chunk_index, data) VALUES (?, ?, ?)
        ON CONFLICT(ino, chunk_index) DO UPDATE SET data = excluded.data
      `).run(this.ino,s,m)}}async truncate(t){let n=(await this.db.prepare("SELECT size FROM fs_inode WHERE ino = ?").get(this.ino))?.size??0;await this.db.exec("BEGIN");try{if(t===0)await this.db.prepare("DELETE FROM fs_data WHERE ino = ?").run(this.ino);else if(t<n){let o=Math.floor((t-1)/this.chunkSize);await this.db.prepare("DELETE FROM fs_data WHERE ino = ? AND chunk_index > ?").run(this.ino,o);let l=t%this.chunkSize;if(l>0){let h=await this.db.prepare("SELECT data FROM fs_data WHERE ino = ? AND chunk_index = ?").get(this.ino,o);if(h&&h.data.length>l){let u=h.data.subarray(0,l);await this.db.prepare("UPDATE fs_data SET data = ? WHERE ino = ? AND chunk_index = ?").run(u,this.ino,o)}}}let s=Math.floor(Date.now()/1e3);await this.db.prepare("UPDATE fs_inode SET size = ?, mtime = ? WHERE ino = ?").run(t,s,this.ino),await this.db.exec("COMMIT")}catch(s){throw await this.db.exec("ROLLBACK"),s}}async fsync(){await this.db.exec("PRAGMA synchronous = FULL"),await this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)")}async fstat(){let a=await this.db.prepare(`
      SELECT ino, mode, nlink, uid, gid, size, atime, mtime, ctime
      FROM fs_inode WHERE ino = ?
    `).get(this.ino);if(!a)throw new Error("File handle refers to deleted inode");return _(a)}},I=class r{db;bufferCtor;rootIno=1;chunkSize=M;constructor(t,a){this.db=t,this.bufferCtor=a}static async fromDatabase(t,a){let e=new r(t,a??__Buffer$);return await e.initialize(),e}getChunkSize(){return this.chunkSize}async initialize(){await this.db.exec(`
      CREATE TABLE IF NOT EXISTS fs_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `),await this.db.exec(`
      CREATE TABLE IF NOT EXISTS fs_inode (
        ino INTEGER PRIMARY KEY AUTOINCREMENT,
        mode INTEGER NOT NULL,
        nlink INTEGER NOT NULL DEFAULT 0,
        uid INTEGER NOT NULL DEFAULT 0,
        gid INTEGER NOT NULL DEFAULT 0,
        size INTEGER NOT NULL DEFAULT 0,
        atime INTEGER NOT NULL,
        mtime INTEGER NOT NULL,
        ctime INTEGER NOT NULL
      )
    `),await this.db.exec(`
      CREATE TABLE IF NOT EXISTS fs_dentry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_ino INTEGER NOT NULL,
        ino INTEGER NOT NULL,
        UNIQUE(parent_ino, name)
      )
    `),await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_fs_dentry_parent
      ON fs_dentry(parent_ino, name)
    `),await this.db.exec(`
      CREATE TABLE IF NOT EXISTS fs_data (
        ino INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        data BLOB NOT NULL,
        PRIMARY KEY (ino, chunk_index)
      )
    `),await this.db.exec(`
      CREATE TABLE IF NOT EXISTS fs_symlink (
        ino INTEGER PRIMARY KEY,
        target TEXT NOT NULL
      )
    `),this.chunkSize=await this.ensureRoot()}async ensureRoot(){let a=await this.db.prepare("SELECT value FROM fs_config WHERE key = 'chunk_size'").get(),e;if(a?e=parseInt(a.value,10)||M:(await this.db.prepare(`
        INSERT INTO fs_config (key, value) VALUES ('chunk_size', ?)
      `).run(M.toString()),e=M),!await this.db.prepare("SELECT ino FROM fs_inode WHERE ino = ?").get(this.rootIno)){let i=Math.floor(Date.now()/1e3);await this.db.prepare(`
        INSERT INTO fs_inode (ino, mode, nlink, uid, gid, size, atime, mtime, ctime)
        VALUES (?, ?, 1, 0, 0, 0, ?, ?, ?)
      `).run(this.rootIno,16877,i,i,i)}return e}normalizePath(t){let a=t.replace(/\/+$/,"")||"/";return a.startsWith("/")?a:"/"+a}splitPath(t){let a=this.normalizePath(t);return a==="/"?[]:a.split("/").filter(e=>e)}async resolvePathOrThrow(t,a){let e=this.normalizePath(t),n=await this.resolvePath(e);if(n===null)throw c({code:"ENOENT",syscall:a,path:e,message:"no such file or directory"});return{normalizedPath:e,ino:n}}async resolvePath(t){let a=this.normalizePath(t);if(a==="/")return this.rootIno;let e=this.splitPath(a),n=this.rootIno;for(let s of e){let o=await this.db.prepare(`
        SELECT ino FROM fs_dentry
        WHERE parent_ino = ? AND name = ?
      `).get(n,s);if(!o)return null;n=o.ino}return n}async resolveParent(t){let a=this.normalizePath(t);if(a==="/")return null;let e=this.splitPath(a),n=e[e.length-1],s=e.length===1?"/":"/"+e.slice(0,-1).join("/"),i=await this.resolvePath(s);return i===null?null:{parentIno:i,name:n}}async createInode(t,a=0,e=0){let n=Math.floor(Date.now()/1e3),s=this.db.prepare(`
      INSERT INTO fs_inode (mode, uid, gid, size, atime, mtime, ctime)
      VALUES (?, ?, ?, 0, ?, ?, ?)
      RETURNING ino
    `),{ino:i}=await s.get(t,a,e,n,n,n);return Number(i)}async createDentry(t,a,e){await this.db.prepare(`
      INSERT INTO fs_dentry (name, parent_ino, ino)
      VALUES (?, ?, ?)
    `).run(a,t,e),await this.db.prepare("UPDATE fs_inode SET nlink = nlink + 1 WHERE ino = ?").run(e)}async ensureParentDirs(t){let a=this.splitPath(t);a.pop();let e=this.rootIno;for(let n of a){let i=await this.db.prepare(`
        SELECT ino FROM fs_dentry
        WHERE parent_ino = ? AND name = ?
      `).get(e,n);if(i)await w(this.db,i.ino,"open",this.normalizePath(t)),e=i.ino;else{let o=await this.createInode(16877);await this.createDentry(e,n,o),e=o}}}async getLinkCount(t){return(await this.db.prepare("SELECT nlink FROM fs_inode WHERE ino = ?").get(t))?.nlink??0}async getInodeMode(t){return(await this.db.prepare("SELECT mode FROM fs_inode WHERE ino = ?").get(t))?.mode??null}async writeFile(t,a,e){await this.ensureParentDirs(t);let n=await this.resolvePath(t),s=typeof e=="string"?e:e?.encoding,i=this.normalizePath(t);if(n!==null)await H(this.db,n,"open",i),await this.updateFileContent(n,a,s);else{let o=await this.resolveParent(t);if(!o)throw c({code:"ENOENT",syscall:"open",path:i,message:"no such file or directory"});await w(this.db,o.parentIno,"open",i);let d=await this.createInode(33188);await this.createDentry(o.parentIno,o.name,d),await this.updateFileContent(d,a,s)}}async updateFileContent(t,a,e){let n=typeof a=="string"?this.bufferCtor.from(a,e??"utf8"):a,s=Math.floor(Date.now()/1e3);if(await this.db.prepare("DELETE FROM fs_data WHERE ino = ?").run(t),n.length>0){let d=this.db.prepare(`
        INSERT INTO fs_data (ino, chunk_index, data)
        VALUES (?, ?, ?)
      `),l=0;for(let E=0;E<n.length;E+=this.chunkSize){let h=n.subarray(E,Math.min(E+this.chunkSize,n.length));await d.run(t,l,h),l++}}await this.db.prepare(`
      UPDATE fs_inode
      SET size = ?, mtime = ?
      WHERE ino = ?
    `).run(n.length,s,t)}async readFile(t,a){let e=typeof a=="string"?a:a?.encoding,{normalizedPath:n,ino:s}=await this.resolvePathOrThrow(t,"open");await k(this.db,s,"open",n);let o=await this.db.prepare(`
      SELECT data FROM fs_data
      WHERE ino = ?
      ORDER BY chunk_index ASC
    `).all(s),d;if(o.length===0)d=this.bufferCtor.alloc(0);else{let h=o.map(u=>u.data);d=this.bufferCtor.concat(h)}let l=Math.floor(Date.now()/1e3);return await this.db.prepare("UPDATE fs_inode SET atime = ? WHERE ino = ?").run(l,s),e?d.toString(e):d}async readdir(t){let{normalizedPath:a,ino:e}=await this.resolvePathOrThrow(t,"scandir");return await F(this.db,e,a),(await this.db.prepare(`
      SELECT name FROM fs_dentry
      WHERE parent_ino = ?
      ORDER BY name ASC
    `).all(e)).map(i=>i.name)}async readdirPlus(t){let{normalizedPath:a,ino:e}=await this.resolvePathOrThrow(t,"scandir");return await F(this.db,e,a),(await this.db.prepare(`
      SELECT d.name, i.ino, i.mode, i.nlink, i.uid, i.gid, i.size, i.atime, i.mtime, i.ctime
      FROM fs_dentry d
      JOIN fs_inode i ON d.ino = i.ino
      WHERE d.parent_ino = ?
      ORDER BY d.name ASC
    `).all(e)).map(i=>({name:i.name,stats:_({ino:i.ino,mode:i.mode,nlink:i.nlink,uid:i.uid,gid:i.gid,size:i.size,atime:i.atime,mtime:i.mtime,ctime:i.ctime})}))}async stat(t){let{normalizedPath:a,ino:e}=await this.resolvePathOrThrow(t,"stat"),s=await this.db.prepare(`
      SELECT ino, mode, nlink, uid, gid, size, atime, mtime, ctime
      FROM fs_inode
      WHERE ino = ?
    `).get(e);if(!s)throw c({code:"ENOENT",syscall:"stat",path:a,message:"no such file or directory"});return _(s)}async lstat(t){return this.stat(t)}async mkdir(t){let a=this.normalizePath(t);if(await this.resolvePath(a)!==null)throw c({code:"EEXIST",syscall:"mkdir",path:a,message:"file already exists"});let n=await this.resolveParent(a);if(!n)throw c({code:"ENOENT",syscall:"mkdir",path:a,message:"no such file or directory"});await w(this.db,n.parentIno,"mkdir",a);let s=await this.createInode(16877);try{await this.createDentry(n.parentIno,n.name,s)}catch{throw c({code:"EEXIST",syscall:"mkdir",path:a,message:"file already exists"})}}async rmdir(t){let a=this.normalizePath(t);R(a,"rmdir");let{ino:e}=await this.resolvePathOrThrow(a,"rmdir"),n=await S(this.db,e,"rmdir",a);if(f(n,"rmdir",a),(n&61440)!==16384)throw c({code:"ENOTDIR",syscall:"rmdir",path:a,message:"not a directory"});if(await this.db.prepare(`
      SELECT 1 as one FROM fs_dentry
      WHERE parent_ino = ?
      LIMIT 1
    `).get(e))throw c({code:"ENOTEMPTY",syscall:"rmdir",path:a,message:"directory not empty"});let o=await this.resolveParent(a);if(!o)throw c({code:"EPERM",syscall:"rmdir",path:a,message:"operation not permitted"});await this.removeDentryAndMaybeInode(o.parentIno,o.name,e)}async unlink(t){let a=this.normalizePath(t);R(a,"unlink");let{ino:e}=await this.resolvePathOrThrow(a,"unlink");await G(this.db,e,a);let n=await this.resolveParent(a);await this.db.prepare(`
      DELETE FROM fs_dentry
      WHERE parent_ino = ? AND name = ?
    `).run(n.parentIno,n.name),await this.db.prepare("UPDATE fs_inode SET nlink = nlink - 1 WHERE ino = ?").run(e),await this.getLinkCount(e)===0&&(await this.db.prepare("DELETE FROM fs_inode WHERE ino = ?").run(e),await this.db.prepare("DELETE FROM fs_data WHERE ino = ?").run(e))}async rm(t,a){let e=this.normalizePath(t),{force:n,recursive:s}=U(a);R(e,"rm");let i=await this.resolvePath(e);if(i===null){v(e,"rm",n);return}let o=await S(this.db,i,"rm",e);f(o,"rm",e);let d=await this.resolveParent(e);if(!d)throw c({code:"EPERM",syscall:"rm",path:e,message:"operation not permitted"});if((o&61440)===16384){if(!s)throw c({code:"EISDIR",syscall:"rm",path:e,message:"illegal operation on a directory"});await this.rmDirContentsRecursive(i),await this.removeDentryAndMaybeInode(d.parentIno,d.name,i);return}await this.removeDentryAndMaybeInode(d.parentIno,d.name,i)}async rmDirContentsRecursive(t){let e=await this.db.prepare(`
      SELECT name, ino FROM fs_dentry
      WHERE parent_ino = ?
      ORDER BY name ASC
    `).all(t);for(let n of e){let s=await this.getInodeMode(n.ino);s!==null&&((s&61440)===16384?(await this.rmDirContentsRecursive(n.ino),await this.removeDentryAndMaybeInode(t,n.name,n.ino)):(f(s,"rm","<symlink>"),await this.removeDentryAndMaybeInode(t,n.name,n.ino)))}}async removeDentryAndMaybeInode(t,a,e){await this.db.prepare(`
      DELETE FROM fs_dentry
      WHERE parent_ino = ? AND name = ?
    `).run(t,a),await this.db.prepare("UPDATE fs_inode SET nlink = nlink - 1 WHERE ino = ?").run(e),await this.getLinkCount(e)===0&&(await this.db.prepare("DELETE FROM fs_inode WHERE ino = ?").run(e),await this.db.prepare("DELETE FROM fs_data WHERE ino = ?").run(e),await this.db.prepare("DELETE FROM fs_symlink WHERE ino = ?").run(e))}async rename(t,a){let e=this.normalizePath(t),n=this.normalizePath(a);if(e===n)return;R(e,"rename"),R(n,"rename");let s=await this.resolveParent(e);if(!s)throw c({code:"EPERM",syscall:"rename",path:e,message:"operation not permitted"});let i=await this.resolveParent(n);if(!i)throw c({code:"ENOENT",syscall:"rename",path:n,message:"no such file or directory"});await w(this.db,i.parentIno,"rename",n),await this.db.exec("BEGIN");try{let d=(await this.resolvePathOrThrow(e,"rename")).ino,l=await S(this.db,d,"rename",e);f(l,"rename",e);let E=(l&61440)===16384;if(E&&n.startsWith(e+"/"))throw c({code:"EINVAL",syscall:"rename",path:n,message:"invalid argument"});let h=await this.resolvePath(n);if(h!==null){let z=await S(this.db,h,"rename",n);f(z,"rename",n);let A=(z&61440)===16384;if(A&&!E)throw c({code:"EISDIR",syscall:"rename",path:n,message:"illegal operation on a directory"});if(!A&&E)throw c({code:"ENOTDIR",syscall:"rename",path:n,message:"not a directory"});if(A&&await this.db.prepare(`
            SELECT 1 as one FROM fs_dentry
            WHERE parent_ino = ?
            LIMIT 1
          `).get(h))throw c({code:"ENOTEMPTY",syscall:"rename",path:n,message:"directory not empty"});await this.removeDentryAndMaybeInode(i.parentIno,i.name,h)}await this.db.prepare(`
        UPDATE fs_dentry
        SET parent_ino = ?, name = ?
        WHERE parent_ino = ? AND name = ?
      `).run(i.parentIno,i.name,s.parentIno,s.name);let m=Math.floor(Date.now()/1e3);await this.db.prepare(`
        UPDATE fs_inode
        SET ctime = ?
        WHERE ino = ?
      `).run(m,d);let y=this.db.prepare(`
        UPDATE fs_inode
        SET mtime = ?, ctime = ?
        WHERE ino = ?
      `);await y.run(m,m,s.parentIno),i.parentIno!==s.parentIno&&await y.run(m,m,i.parentIno),await this.db.exec("COMMIT")}catch(o){throw await this.db.exec("ROLLBACK"),o}}async copyFile(t,a){let e=this.normalizePath(t),n=this.normalizePath(a);if(e===n)throw c({code:"EINVAL",syscall:"copyfile",path:n,message:"invalid argument"});let{ino:s}=await this.resolvePathOrThrow(e,"copyfile");await k(this.db,s,"copyfile",e);let o=await this.db.prepare(`
      SELECT mode, uid, gid, size FROM fs_inode WHERE ino = ?
    `).get(s);if(!o)throw c({code:"ENOENT",syscall:"copyfile",path:e,message:"no such file or directory"});let d=await this.resolveParent(n);if(!d)throw c({code:"ENOENT",syscall:"copyfile",path:n,message:"no such file or directory"});await w(this.db,d.parentIno,"copyfile",n),await this.db.exec("BEGIN");try{let l=Math.floor(Date.now()/1e3),E=await this.resolvePath(n);if(E!==null){let h=await S(this.db,E,"copyfile",n);if(f(h,"copyfile",n),(h&61440)===16384)throw c({code:"EISDIR",syscall:"copyfile",path:n,message:"illegal operation on a directory"});await this.db.prepare("DELETE FROM fs_data WHERE ino = ?").run(E),await this.db.prepare(`
          INSERT INTO fs_data (ino, chunk_index, data)
          SELECT ?, chunk_index, data
          FROM fs_data
          WHERE ino = ?
          ORDER BY chunk_index ASC
        `).run(E,s),await this.db.prepare(`
          UPDATE fs_inode
          SET mode = ?, uid = ?, gid = ?, size = ?, mtime = ?, ctime = ?
          WHERE ino = ?
        `).run(o.mode,o.uid,o.gid,o.size,l,l,E)}else{let h=await this.createInode(o.mode,o.uid,o.gid);await this.createDentry(d.parentIno,d.name,h),await this.db.prepare(`
          INSERT INTO fs_data (ino, chunk_index, data)
          SELECT ?, chunk_index, data
          FROM fs_data
          WHERE ino = ?
          ORDER BY chunk_index ASC
        `).run(h,s),await this.db.prepare(`
          UPDATE fs_inode
          SET size = ?, mtime = ?, ctime = ?
          WHERE ino = ?
        `).run(o.size,l,l,h)}await this.db.exec("COMMIT")}catch(l){throw await this.db.exec("ROLLBACK"),l}}async symlink(t,a){let e=this.normalizePath(a);if(await this.resolvePath(e)!==null)throw c({code:"EEXIST",syscall:"open",path:e,message:"file already exists"});let s=await this.resolveParent(e);if(!s)throw c({code:"ENOENT",syscall:"open",path:e,message:"no such file or directory"});await w(this.db,s.parentIno,"open",e);let i=41471,o=await this.createInode(i);await this.createDentry(s.parentIno,s.name,o),await this.db.prepare("INSERT INTO fs_symlink (ino, target) VALUES (?, ?)").run(o,t),await this.db.prepare("UPDATE fs_inode SET size = ? WHERE ino = ?").run(t.length,o)}async readlink(t){let{normalizedPath:a,ino:e}=await this.resolvePathOrThrow(t,"open"),n=await this.getInodeMode(e);if(n===null||(n&61440)!==40960)throw c({code:"EINVAL",syscall:"open",path:a,message:"invalid argument"});let i=await this.db.prepare("SELECT target FROM fs_symlink WHERE ino = ?").get(e);if(!i)throw c({code:"ENOENT",syscall:"open",path:a,message:"no such file or directory"});return i.target}async access(t){let a=this.normalizePath(t);if(await this.resolvePath(a)===null)throw c({code:"ENOENT",syscall:"access",path:a,message:"no such file or directory"})}async statfs(){let a=await this.db.prepare("SELECT COUNT(*) as count FROM fs_inode").get(),n=await this.db.prepare("SELECT COALESCE(SUM(LENGTH(data)), 0) as total FROM fs_data").get();return{inodes:a.count,bytesUsed:n.total}}async open(t){let{normalizedPath:a,ino:e}=await this.resolvePathOrThrow(t,"open");return await k(this.db,e,"open",a),new P(this.db,this.bufferCtor,e,this.chunkSize)}async deleteFile(t){return await this.unlink(t)}};var g=class r{db;constructor(t){this.db=t}static async fromDatabase(t){let a=new r(t);return await a.initialize(),a}async initialize(){await this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parameters TEXT,
        result TEXT,
        error TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        duration_ms INTEGER
      )
    `),await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tool_calls_name
      ON tool_calls(name)
    `),await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tool_calls_started_at
      ON tool_calls(started_at)
    `)}async start(t,a){let e=a!==void 0?JSON.stringify(a):null,n=Math.floor(Date.now()/1e3),s=this.db.prepare(`
      INSERT INTO tool_calls (name, parameters, status, started_at)
      VALUES (?, ?, 'pending', ?)
      RETURNING id
    `),{id:i}=await s.get(t,e,n);return Number(i)}async success(t,a){let e=a!==void 0?JSON.stringify(a):null,n=Math.floor(Date.now()/1e3),i=await this.db.prepare("SELECT started_at FROM tool_calls WHERE id = ?").get(t);if(!i)throw new Error(`Tool call with ID ${t} not found`);let o=(n-i.started_at)*1e3;await this.db.prepare(`
      UPDATE tool_calls
      SET status = 'success', result = ?, completed_at = ?, duration_ms = ?
      WHERE id = ?
    `).run(e,n,o,t)}async error(t,a){let e=Math.floor(Date.now()/1e3),s=await this.db.prepare("SELECT started_at FROM tool_calls WHERE id = ?").get(t);if(!s)throw new Error(`Tool call with ID ${t} not found`);let i=(e-s.started_at)*1e3;await this.db.prepare(`
      UPDATE tool_calls
      SET status = 'error', error = ?, completed_at = ?, duration_ms = ?
      WHERE id = ?
    `).run(a,e,i,t)}async record(t,a,e,n,s,i){let o=n!==void 0?JSON.stringify(n):null,d=s!==void 0?JSON.stringify(s):null,l=(e-a)*1e3,E=i?"error":"success",h=this.db.prepare(`
      INSERT INTO tool_calls (name, parameters, result, error, status, started_at, completed_at, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `),{id:u}=await h.get(t,o,d,i||null,E,a,e,l);return Number(u)}async get(t){let e=await this.db.prepare(`
      SELECT * FROM tool_calls WHERE id = ?
    `).get(t);if(e)return this.rowToToolCall(e)}async getByName(t,a){let e=a!==void 0?`LIMIT ${a}`:"";return(await this.db.prepare(`
      SELECT * FROM tool_calls
      WHERE name = ?
      ORDER BY started_at DESC
      ${e}
    `).all(t)).map(i=>this.rowToToolCall(i))}async getRecent(t,a){let e=a!==void 0?`LIMIT ${a}`:"";return(await this.db.prepare(`
      SELECT * FROM tool_calls
      WHERE started_at > ?
      ORDER BY started_at DESC
      ${e}
    `).all(t)).map(i=>this.rowToToolCall(i))}async getStats(){return(await this.db.prepare(`
      SELECT
        name,
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        AVG(duration_ms) as avg_duration_ms
      FROM tool_calls
      WHERE status != 'pending'
      GROUP BY name
      ORDER BY total_calls DESC
    `).all()).map(e=>({name:e.name,total_calls:e.total_calls,successful:e.successful,failed:e.failed,avg_duration_ms:e.avg_duration_ms||0}))}rowToToolCall(t){return{id:t.id,name:t.name,parameters:t.parameters!==null?JSON.parse(t.parameters):void 0,result:t.result!==null?JSON.parse(t.result):void 0,error:t.error!==null?t.error:void 0,status:t.status,started_at:t.started_at,completed_at:t.completed_at!==null?t.completed_at:void 0,duration_ms:t.duration_ms!==null?t.duration_ms:void 0}}};import{Buffer as Y}from"./buffer.js";var X=class r extends D{static async openWith(t){let[a,e,n]=await Promise.all([N.fromDatabase(t),I.fromDatabase(t,Y),g.fromDatabase(t)]);return new r(t,a,e,n)}};export{X as AgentFS,I as Filesystem,N as KvStore,g as ToolCalls};
//# sourceMappingURL=agentfs-sdk.bundle.mjs.map