# Sistema de Vendas com Comissões, Metas e Performance

API REST em **Node.js + Express + MySQL (mysql2/promise)** para gerenciar vendedores, vendas, comissões e metas, com relatório gerencial de performance.

## Requisitos
- Node.js 18+
- MySQL 8.0.16+ (usa restrições `CHECK`)

## Instalação e execução
```bash
# 1. Instalar dependências
npm install

# 2. Criar banco, tabelas e dados de teste
mysql -u root -p < db_vendas.sql

# 3. Configurar variáveis de ambiente
cp .env.example .env      # edite DB_USER e DB_PASSWORD

# 4. Subir a API
npm start                 # http://localhost:3000
```
> O arquivo `.env` está no `.gitignore`: nenhuma senha vai para o repositório.

## Estrutura
```
server.js            # inicialização + teste de conexão
db_vendas.sql        # DDL + dados de teste (5 vendedores, 4 regiões, 15 vendas)
src/db.js            # pool mysql2/promise (credenciais via .env)
src/comissao.js      # calcularComissao() - regra única de comissão
src/vendedores.js    # cadastrar/listar/consultar/atualizar/desativar
src/vendas.js        # registrar/listar/consultar por vendedor e região/excluir
src/relatorios.js    # gerarRelatorioPerformance()
src/app.js           # rotas Express + tratamento central de erros
src/erros.js         # ErroApp e validações
```

## Regras de comissão
`comissão = valor × (percentual_base + bônus_cliente + bônus_região) / 100` (percentuais somados, sem composição).

| Cliente | Bônus | Região | Bônus |
|---|---|---|---|
| PF | 2% | Norte / Nordeste | 1% |
| PJ | 3% | Sudeste / Sul | 0% / 0,5% |

Exemplo: R$ 2.000 · PJ · Norte · base 5% → 5+3+1 = 9% → **R$ 180,00**.

## Endpoints
| Método | Endpoint | Operação | Sucesso |
|---|---|---|---|
| POST | `/vendedores` | Cadastrar vendedor | 201 |
| GET | `/vendedores` | Listar (`?ativos=true` filtra ativos) | 200 |
| GET | `/vendedores/:id` | Consultar | 200 / 404 |
| PUT | `/vendedores/:id` | Atualizar meta e/ou % base | 200 |
| PATCH | `/vendedores/:id/desativar` | Desativar (mantém histórico) | 200 |
| POST | `/vendas` | Registrar venda | 201 |
| GET | `/vendas` | Listar vendas | 200 |
| GET | `/vendas/vendedor/:id` | Vendas por vendedor | 200 / 404 |
| GET | `/vendas/regiao/:id` | Vendas por região | 200 / 404 |
| DELETE | `/vendas/:id` | Excluir venda | 200 / 404 |
| GET | `/relatorios/performance?inicio=&fim=` | Relatório gerencial | 200 / 400 |
| GET | `/regioes` | Lista regiões (auxiliar) | 200 |

Códigos de erro: `400` validação (valor ≤ 0, vendedor inativo, datas inválidas), `404` não encontrado (vendedor/região/venda), `409` código de venda duplicado, `500` erro de banco/conexão.

## Roteiro de testes (Postman / Insomnia / Thunder Client)
Todos com `Content-Type: application/json`.

1. **Cadastrar vendedor** — `POST /vendedores`
   ```json
   { "nome": "Fernanda Costa", "meta_mensal": 12000, "percentual_base": 4.5 }
   ```
2. **Venda com comissão correta** — `POST /vendas` (vendedor 1 tem base 5%)
   ```json
   { "id_vendedor": 1, "id_regiao": 1, "valor_venda": 2000, "tipo_cliente": "PJ" }
   ```
   Esperado: `valor_comissao: 180`, `percentual_total: 9`.
3. **Código duplicado** — `POST /vendas` com `"id_venda": 1` → **409**.
4. **Vendedor inexistente** — `id_vendedor: 999` → **404**. **Inativo** — primeiro `PATCH /vendedores/5/desativar`, depois vender com `id_vendedor: 5` → **400**.
5. **Valor inválido** — `"valor_venda": -10` → **400**.
6. **Atualizar meta** — `PUT /vendedores/2` com `{ "meta_mensal": 13000 }` → 200.
7. **Consultas** — `GET /vendas/regiao/1` e `GET /vendas/vendedor/3`.
8. **Relatório** — `GET /relatorios/performance?inicio=2026-10-01&fim=2026-10-31`
   Com os dados do script: 15 vendas e **3 metas atingidas** (Ana, Carla e Diego).
9. **Excluir** — `DELETE /vendas/15` → 200; repetir → **404**.
10. **Erro de conexão** — pare o MySQL (ou use senha errada no `.env`) e chame `GET /vendas` → **500** `"Falha na conexão com o banco de dados."`.

> Tire capturas de tela de cada requisição/resposta e salve na pasta `prints/`.

## Entrega no GitHub
```bash
git init && git add . && git commit -m "Sistema de vendas e comissões"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sistema-vendas.git
git push -u origin main
```
