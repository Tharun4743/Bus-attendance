# 🛡️ ZERO-SECRET GIT & GITHUB REPOSITORY POLICY

## STRICT PROHIBITION ON COMMITTING SECRETS
Under NO circumstance may any secret, API key, JWT token, database password, or sensitive credential string be committed or pushed to GitHub:

1. **No Plaintext Passwords in Tracked Files**:
   - `tests/*.http`: Always use `{{$dotenv VAR}}` or generic non-sensitive dummy placeholders (`your_admin_password`).
   - `db/seed.sql`: Never include personal passwords or realistic hashes. Use non-sensitive setup defaults or environment variables.
   - `.env.example`: Only use descriptive placeholders (e.g. `your_api_key_here`). Do not use real vendor prefixes or realistic tokens.
2. **Strict Environment File Isolation**:
   - All live secrets reside exclusively in untracked `.env` files.
   - `.gitignore` must ignore `.env`, `.env.*.local`, `*.pem`, `*.key`.
3. **Pre-Commit Diff Verification**:
   - Always run `git diff --cached` prior to staging/committing to audit that no secrets are present.
