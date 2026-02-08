import Database from 'better-sqlite3';
import * as path from 'path';
import { encrypt, decrypt, getDataDir } from './encryption';
import type {
  Todo,
  Message,
  Session,
  Setting,
  DatabaseOperations,
} from './types';

const DB_PATH = path.join(getDataDir(), 'data.db');

let dbInstance: Database.Database | null = null;

function initializeDatabase(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      agent TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      todo_id TEXT,
      session_id TEXT,
      read INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      started_at INTEGER DEFAULT (unixepoch()),
      ended_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_todos_session_id ON todos(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_todo_id ON messages(todo_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
  `);

  return db;
}

function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

const db: DatabaseOperations = {
  createTodo(todo: Omit<Todo, 'created_at' | 'updated_at'>): Todo {
    const database = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const stmt = database.prepare(`
      INSERT INTO todos (id, session_id, content, status, priority, agent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      todo.id,
      todo.session_id,
      todo.content,
      todo.status,
      todo.priority,
      todo.agent,
      now,
      now
    );

    return {
      ...todo,
      created_at: now,
      updated_at: now,
    };
  },

  getTodo(id: string): Todo | null {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM todos WHERE id = ?');
    return (stmt.get(id) as Todo) || null;
  },

  getAllTodos(): Todo[] {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM todos ORDER BY created_at DESC');
    return stmt.all() as Todo[];
  },

  updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'created_at'>>): Todo {
    const database = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const todo = db.getTodo(id);
    if (!todo) {
      throw new Error(`Todo with id ${id} not found`);
    }

    const updated = { ...todo, ...updates, updated_at: now };

    const stmt = database.prepare(`
      UPDATE todos
      SET session_id = ?, content = ?, status = ?, priority = ?, agent = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updated.session_id,
      updated.content,
      updated.status,
      updated.priority,
      updated.agent,
      now,
      id
    );

    return updated;
  },

  deleteTodo(id: string): boolean {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM todos WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes ?? 0) > 0;
  },

  createMessage(message: Omit<Message, 'id' | 'created_at'>): Message {
    const database = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const encryptedContent = encrypt(message.content);

    const stmt = database.prepare(`
      INSERT INTO messages (type, content, todo_id, session_id, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      message.type,
      encryptedContent,
      message.todo_id,
      message.session_id,
      message.read,
      now
    );

    return {
      ...message,
      id: (result.lastInsertRowid as number) || 0,
      created_at: now,
      content: message.content,
    };
  },

  getMessage(id: number): Message | null {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return {
      ...row,
      content: decrypt(row.content),
    };
  },

  getMessages(filters?: {
    todo_id?: string;
    session_id?: string;
    read?: boolean;
  }): Message[] {
    const database = getDatabase();

    let query = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];

    if (filters?.todo_id) {
      query += ' AND todo_id = ?';
      params.push(filters.todo_id);
    }

    if (filters?.session_id) {
      query += ' AND session_id = ?';
      params.push(filters.session_id);
    }

    if (filters?.read !== undefined) {
      query += ' AND read = ?';
      params.push(filters.read ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = database.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      content: decrypt(row.content),
    }));
  },

  markMessageAsRead(id: number): boolean {
    const database = getDatabase();
    const stmt = database.prepare('UPDATE messages SET read = 1 WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes ?? 0) > 0;
  },

  deleteMessage(id: number): boolean {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM messages WHERE id = ?');
    const result = stmt.run(id);
    return (result.changes ?? 0) > 0;
  },

  createSession(session: Omit<Session, 'started_at'>): Session {
    const database = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const stmt = database.prepare(`
      INSERT INTO sessions (id, name, started_at, ended_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(session.id, session.name, now, session.ended_at);

    return {
      ...session,
      started_at: now,
    };
  },

  getSession(id: string): Session | null {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM sessions WHERE id = ?');
    return (stmt.get(id) as Session) || null;
  },

  getAllSessions(): Session[] {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM sessions ORDER BY started_at DESC');
    return stmt.all() as Session[];
  },

  endSession(id: string): Session | null {
    const database = getDatabase();
    const now = Math.floor(Date.now() / 1000);

    const session = db.getSession(id);
    if (!session) {
      return null;
    }

    const stmt = database.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?');
    stmt.run(now, id);

    return {
      ...session,
      ended_at: now,
    };
  },

  getSetting(key: string): string | null {
    const database = getDatabase();
    const stmt = database.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as any;
    return row?.value || null;
  },

  setSetting(key: string, value: string): void {
    const database = getDatabase();
    const stmt = database.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  },

  getAllSettings(): Record<string, string> {
    const database = getDatabase();
    const stmt = database.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as Setting[];
    return rows.reduce(
      (acc, row) => {
        acc[row.key] = row.value;
        return acc;
      },
      {} as Record<string, string>
    );
  },

  close(): void {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  },
};

export default db;
export type { Todo, Message, Session, Setting, DatabaseOperations };
