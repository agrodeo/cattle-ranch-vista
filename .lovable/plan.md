
## Plan: Update Paddle Price IDs

### What to do
Replace the 8 placeholder price IDs in `src/config/paddleProducts.ts` with the real ones provided.

### Mapping
| Plan key (code) | Monthly | Annual |
|---|---|---|
| `personal` | `pri_01kk2r774yhyxjpnba3ejqs62d` | `pri_01kk2r6pf6btx3wqsn7jvqgzer` |
| `avanzado` | `pri_01kk2qvb715hth3rqsvecej1at` | `pri_01kk2r58q4y7jjzjgm78yxwqxt` |
| `productor` | `pri_01kk2qx43k51pwns7zayrg9z6z` | `pri_01kk2r49eemxkj94an05qgh7g6` |
| `cabana` | `pri_01kk2qz2g4dkds653mj27fbzqs` | `pri_01kk2r33w832qdnf1z039w1qkp` |

### Single file change
- **`src/config/paddleProducts.ts`** — lines 11–14: replace the 4 `paddlePriceIds` entries with the real IDs above. Everything else (token, env, interface, helper function) stays untouched.

### Note
`PADDLE_ENV` stays `'sandbox'` as previously instructed. Once products are verified and ready for production, change it to `'production'`.
