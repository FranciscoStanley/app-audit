# Deploy App Audit — Oracle Cloud (São Paulo)

**Região:** [sa-saopaulo-1](https://cloud.oracle.com/?region=sa-saopaulo-1)  
**Autor:** Francisco Stanley Rodrigues Albuquerque

> O agente de IA **não acessa** sua sessão logada no Oracle Cloud. O deploy usa **API Key (OCI CLI)** ou **Console + SSH**.

---

## Caminho A — Automático (OCI CLI + API Key)

### 1. Criar API Key no Console

1. [Profile → User settings → API Keys → Add API Key](https://cloud.oracle.com/identity/domains/my-profile?region=sa-saopaulo-1)
2. **Generate API Key Pair** → baixe o `.pem` em local seguro (ex.: `%USERPROFILE%\.oci\oci_api_key.pem`)
3. Anote o **Tenancy OCID** e **User OCID** exibidos

### 2. Instalar e configurar OCI CLI (Windows)

```powershell
winget install Oracle.OCI.CLI
oci setup config
# fingerprint: copie do Console após upload da chave pública
# region: sa-saopaulo-1
```

### 3. Variáveis no `.env` local (raiz do projeto)

```env
OCI_REGION=sa-saopaulo-1
OCI_TENANCY_OCID=ocid1.tenancy.oc1..aaaa...
OCI_COMPARTMENT_OCID=ocid1.compartment.oc1..aaaa...
```

(`OCI_COMPARTMENT_OCID` pode ser igual ao tenancy na conta pessoal.)

### 4. Chave SSH

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519_oracle"
```

### 5. Provisionar VM + deploy

No Git Bash ou WSL:

```bash
cd /c/Users/Stanley/Downloads/app-audit
source .env
bash scripts/oracle-cloud/00-provision-free-vm.sh
PUBLIC_IP=$(cat /tmp/app-audit-oracle-ip)
bash scripts/oracle-cloud/04-prepare-oracle-env.sh "$PUBLIC_IP"
bash scripts/oracle-cloud/05-remote-deploy.sh "$PUBLIC_IP"
```

---

## Caminho B — Console manual + script PowerShell

### 1. Criar VM

[Compute → Create instance](https://cloud.oracle.com/compute/instances?region=sa-saopaulo-1)

| Campo | Valor |
|-------|--------|
| Image | Ubuntu 22.04/24.04 **aarch64** |
| Shape | VM.Standard.A1.Flex — 1 OCPU, 6 GB |
| Subnet | Pública + IPv4 |
| Cloud-init | Cole `infra/oracle-cloud/cloud-init.yaml` |
| Security List | Portas 22, 3000, 3001 |

### 2. Deploy do PC

```powershell
cd C:\Users\Stanley\Downloads\app-audit
.\scripts\oracle-cloud\push-env.ps1 -PublicIp SEU_IP_PUBLICO
```

---

## Verificação

| URL | Esperado |
|-----|----------|
| `http://IP:3000/health` | status ok |
| `http://IP:3001` | login App Audit |

Login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env` local.

---

## Arquivos do repositório

| Arquivo | Função |
|---------|--------|
| `docker-compose.oracle.yml` | Compose produção |
| `infra/oracle-cloud/cloud-init.yaml` | Bootstrap na criação da VM |
| `scripts/oracle-cloud/00-provision-free-vm.sh` | Cria VM via OCI CLI |
| `scripts/oracle-cloud/04-prepare-oracle-env.sh` | Gera `.env.oracle.local` |
| `scripts/oracle-cloud/05-remote-deploy.sh` | SSH + deploy |
| `scripts/oracle-cloud/push-env.ps1` | Deploy via PowerShell |

---

## Segurança e Git

Arquivos sensíveis da Oracle estão no `.gitignore` — **não commitar**:

| Arquivo / pasta | Conteúdo |
|-----------------|----------|
| `.env` | `OCI_*`, `JWT_SECRET`, `GITHUB_TOKEN`, etc. |
| `.env.oracle.local` | `.env` gerado para a VM |
| `%USERPROFILE%\.oci\` | `config` + `oci_api_key.pem` (fora do repo; `.oci/` ignorado se copiado) |
| `*.pem` / `oci_api_key*.pem` | Chaves privadas/públicas OCI |
| `~/.ssh/id_ed25519_oracle` | Chave SSH da VM (fora do repo) |

Pode commitar apenas templates: `.env.oracle.example`, `.env.docker.example`, `.env.production.example`.

Antes de push:

```powershell
git status
git check-ignore -v .env .env.oracle.local
```

- Em produção: `SWAGGER_ENABLED=false`
- Atualize GitHub OAuth callback para `http://SEU_IP:3000/v1/auth/github/callback`

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Shape A1 indisponível | Tente outro AD ou horário; capacidade free esgota |
| SSH timeout | Security List + ufw (porta 22) |
| Frontend sem API | Rebuild com `NEXT_PUBLIC_API_URL` correto |
| OCI CLI auth fail | Refaça `oci setup config` com fingerprint correto |

Ver também: [docs/deployment.md](./deployment.md)
