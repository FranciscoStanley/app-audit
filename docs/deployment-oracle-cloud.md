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

## Retry automático (sem capacidade A1)

Quando `Out of host capacity` em São Paulo:

```powershell
cd C:\Users\Stanley\Downloads\app-audit

# Uma tentativa agora (1 OCPU/6 GB e 2 OCPU/12 GB)
.\scripts\oracle-cloud\retry-oracle-deploy.ps1

# Agendar a cada 1 hora (7 dias) até conseguir VM + deploy
.\scripts\oracle-cloud\schedule-oracle-retry.ps1

# Ver log
Get-Content .\logs\oracle-retry.log -Tail 30
```

### Tentar outra região (ex.: Canadá)

Sua tenancy precisa **inscrever** a região antes da API funcionar:

1. Console → canto superior direito → **Region Management**
2. **Subscribe** → `ca-montreal-1` ou `ca-toronto-1`
3. Aguarde status **READY**
4. O script detecta regiões inscritas automaticamente — rode o retry de novo

```powershell
.\scripts\oracle-cloud\list-oci-regions.ps1
```

> **Não use** `VM.Standard.E2.1.Micro` para o app-audit (1 GB RAM — insuficiente para Docker + Chromium).

---

## Verificação

Adicione o IP da VM ao arquivo **hosts** (como administrador):

```
IP_DA_VM app-audit
```

| URL | Esperado |
|-----|----------|
| `http://app-audit:3000/health` | status ok |
| `http://app-audit:3001` | login App Audit |

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
| `scripts/oracle-cloud/00f-launch-multi-region.sh` | VM A1 multi-região + shapes |
| `scripts/oracle-cloud/auto-retry-oracle.ps1` | Retry + deploy automático |
| `scripts/oracle-cloud/schedule-oracle-retry.ps1` | Agenda retry horário (Windows) |
| `scripts/oracle-cloud/list-oci-regions.ps1` | Regiões inscritas + dica Canadá |

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
- Atualize GitHub OAuth callback para `http://app-audit:3000/v1/auth/github/callback` (e a entrada `IP app-audit` no hosts)

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Shape A1 indisponível | Tente outro AD ou horário; capacidade free esgota |
| SSH timeout | Security List + ufw (porta 22) |
| Frontend sem API | Rebuild com `NEXT_PUBLIC_API_URL` correto |
| OCI CLI auth fail | Refaça `oci setup config` com fingerprint correto |

Ver também: [docs/deployment.md](./deployment.md)
