# Commands — copy & paste

Every command an agent asks you to run gets added here. All are written as **single lines** so they work in both Git Bash and PowerShell on Windows.

> **Security:** commands containing a password are marked 🔑. Run those in a **normal terminal**, not with the `!` prefix inside Claude Code — the `!` prefix pipes output into the conversation, which would put your credentials in the transcript.

---

## 1. Connect the MongoDB MCP server (read-only) 🔑

**Step 1 — create the read-only user in Atlas (UI, no command):**
Atlas → Security → **Database Access** → **Add New Database User** → Password auth → username `claude_readonly` → **Autogenerate Secure Password** (copy it) → Database User Privileges → **Specific Privileges** → role `read` on database `test` → **Add User**.

**Step 2 — get the connection string:**
Atlas → **Connect** → **Drivers** → copy the string. It looks like `mongodb+srv://<user>:<pass>@<cluster>.epd9uqs.mongodb.net/...`

**Step 3 — register the server.** Run this **from the project folder** `C:\Users\prosecution\medconnectoverseas` — the folder you run it in is what scopes it to this project.

Replace `USERNAME`, `PASSWORD` and `CLUSTER`:

```bash
claude mcp add mongodb --scope local -e MDB_MCP_CONNECTION_STRING="mongodb+srv://USERNAME:PASSWORD@CLUSTER.epd9uqs.mongodb.net/test?retryWrites=true&w=majority" -e MDB_MCP_READ_ONLY="true" -- npx -y mongodb-mcp-server@latest --readOnly
```

Then restart Claude Code (or run `/mcp`) so it connects.

### Verify it is scoped to this project only

```bash
claude mcp list
```

```bash
claude mcp get mongodb
```

Run `claude mcp list` from a **different** project folder — `mongodb` must **not** appear there. If it does, it was added as user scope; remove it and redo step 3:

```bash
claude mcp remove mongodb --scope user
```

### Remove it

```bash
claude mcp remove mongodb
```

### Troubleshooting: "The configured connection string is not valid" 🔑

Test the connection string on its own, without it appearing in any output. **Step 1** — put it in a temporary variable (this line contains your password, so a normal terminal only):

Git Bash:
```bash
export T="mongodb+srv://USERNAME:PASSWORD@CLUSTER.epd9uqs.mongodb.net/test?retryWrites=true&w=majority"
```

PowerShell:
```powershell
$env:T = "mongodb+srv://USERNAME:PASSWORD@CLUSTER.epd9uqs.mongodb.net/test?retryWrites=true&w=majority"
```

**Step 2** — test it. This prints only success or the error, never the string:

```bash
cd backend && node -e "const u=process.env.T; if(!u){console.log('T is not set');process.exit(1)} const {MongoClient}=require('mongodb'); const c=new MongoClient(u); c.connect().then(async()=>{console.log('CONNECTED — database:', c.db().databaseName); console.log('collections:', (await c.db().listCollections().toArray()).length); await c.close();}).catch(e=>console.log('FAILED:', e.message));"
```

**Step 3** — clear the variable:

```bash
unset T
```

#### Fixing a wrong connection string

**Option A — redo via the CLI (recommended).** `claude mcp add` overwrites cleanly, so no file editing:

```bash
claude mcp remove mongodb
```

Then re-run the `claude mcp add` line above with the corrected string and restart Claude Code.

**Option B — edit the config file by hand.** Only if Option A will not do. **Close Claude Code first** — it rewrites this file on exit and would clobber your edits.

Back it up:
```powershell
Copy-Item C:\Users\prosecution\.claude.json C:\Users\prosecution\.claude.json.bak
```

Open it:
```powershell
code C:\Users\prosecution\.claude.json
```

Search for `MDB_MCP_CONNECTION_STRING`. With `--scope local` it lives under `projects` → your project path → `mcpServers` → `mongodb` → `env`. Fix the value, save, reopen Claude Code. If Claude Code will not start afterwards the JSON is malformed — restore the `.bak`.

#### Percent-encoding for passwords

If the password contains any of these, encode it or the URI parser fails:

| Character | Replace with |
|---|---|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |

Simpler: Atlas → Database Access → Edit user → **Edit Password** → use letters and digits only.

Most common causes, in order:

1. **Special characters in the password.** `@ : / ? # [ ] %` must be percent-encoded, or the URI parser breaks. Easiest fix is to reset the Atlas password to letters and digits only.
2. **Placeholders left in** — `<db_password>`, `USERNAME`, or the angle brackets copied from Atlas.
3. **Wrong cluster name.** Copy it fresh from Atlas → Connect → Drivers.
4. **User not created yet**, or created on a different Atlas project.
5. **IP not allowlisted** — Atlas → Network Access.

---

## 2. Run the app

Backend (`http://localhost:5000`):

```bash
cd backend && npm run dev
```

Frontend (`http://localhost:5174`) — in a second terminal, from the project root:

```bash
npm run dev
```

---

## 3. Build

Backend. **Always use this, never bare `tsc`** — `tsc` alone does not copy the email templates into `dist/`, which makes production send blank emails:

```bash
cd backend && npm run build
```

Typecheck only, no output:

```bash
cd backend && npx tsc --noEmit
```

Frontend:

```bash
npm run build
```

---

## 4. Email templates

Regenerate all 20 templates after editing `_build.mjs`. Never hand-edit the generated `.html` files:

```bash
cd backend && npm run build:emails
```

---

## 5. Database seeding

Create the default admin account (`admin@medconnectsoverseas.com` / `adminpassword123`):

```bash
cd backend && npx ts-node src/utils/seedAdmin.ts
```

---

## 6. Git

Check what changed:

```bash
git status
```

Review changes before committing:

```bash
git diff
```

---

## 7. Useful checks

Is anything already listening on the dev ports?

```powershell
Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -in 5000,5174} | Select-Object LocalPort,OwningProcess
```

Stop a process by its PID (from the command above):

```powershell
Stop-Process -Id <PID> -Force
```
