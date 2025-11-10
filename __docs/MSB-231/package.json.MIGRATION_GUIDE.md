# 🚀 Migration Guide: NPM Scripts Reorganization

## ✅ Changes Implemented

The package.json scripts have been reorganized following a consistent naming convention with better categorization and help commands.

---

## 📚 New Structure

### Main Help Command
```bash
npm run help
```
Shows all available script categories.

### Category Help Commands
- `npm run dev:help` - Development scripts
- `npm run build:help` - Build scripts
- `npm run test:help` - Testing scripts
- `npm run db:help` - Database scripts
- `npm run deploy:help` - Deployment scripts
- `npm run health:help` - Health check scripts
- `npm run perf:help` - Performance scripts
- `npm run clean:help` - Cleanup scripts

---

## 🔄 Migration Table

### Development Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run start:local` | `npm run dev:start` | ⚠️ Deprecated |
| `npm run watch` | `npm run dev:watch` | ⚠️ Deprecated |
| `npm run dev` | `npm run dev:with-data` | ⚠️ Deprecated |
| `npm run dev:test` | `npm run dev:test-env` | ⚠️ Deprecated |
| `npm run hybrid` | `npm run dev:hybrid` | ⚠️ Deprecated |
| `npm run prod` | `npm run dev:prod-like` | ⚠️ Deprecated |
| `npm run setup:dev-data` | `npm run dev:load-data` | ⚠️ Deprecated |

### Build Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run build` | `npm run build:prod` | ⚠️ Deprecated |
| `npm run build:ts` | `npm run build:typescript` | ⚠️ Deprecated |
| `npm run build:cloudfoundry` | `npm run build:cf` | ⚠️ Deprecated |
| `npm run build:mta` | `npm run build:mtar` | ⚠️ Deprecated |
| `npm run copy:extras` | `npm run build:copy-assets` | ⚠️ Deprecated |
| `npm run copy:files` | `npm run build:copy-minimal` | ⚠️ Deprecated |

### Testing Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run jest` | `npm run test:all` | ⚠️ Deprecated |
| `npm run jest:unit` | `npm run test:unit` | ⚠️ Deprecated |
| `npm run jest:coverage` | `npm run test:coverage` | ⚠️ Deprecated |
| `npm run jest:service` | `npm run test:service` | ⚠️ Deprecated |
| `npm run jest:workflow` | `npm run test:workflow` | ⚠️ Deprecated |
| `npm run jest:integration` | `npm run test:integration` | ⚠️ Deprecated |
| `npm run jest:e2e` | `npm run test:e2e` | ⚠️ Deprecated |
| `npm run jest:coverage:report` | `npm run test:report` | ⚠️ Deprecated |
| `npm run jest:watch` | `npm run test:watch` | ⚠️ Deprecated |
| `npm run jest:ci` | `npm run test:ci` | ⚠️ Deprecated |
| `npm run jest:clean` | `npm run clean:test-cache` | ⚠️ Deprecated |
| `npm run jest:debug` | `npm run test:debug` | ⚠️ Deprecated |

### Database Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run db:deploy` | `npm run db:deploy` | ✅ No change |
| `npm run db:deploy:dev` | `npm run db:deploy:dev` | ✅ No change (updated internally) |
| `npm run db:deploy:test` | `npm run db:deploy:test` | ✅ No change |
| `npm run db:deploy:hybrid` | `npm run db:deploy:hybrid` | ✅ No change |
| `npm run db:deploy:prod` | `npm run db:deploy:prod` | ✅ No change |

### Deployment Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm start` | `npm start` | ✅ No change |
| `npm run deploy` | `npm run deploy:cf` | ⚠️ Deprecated |
| `npm run undeploy` | `npm run deploy:undeploy` | ⚠️ Deprecated |

### Health Check Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run health:check` | ❌ Removed | Use specific commands |
| `npm run health:simple` | ❌ Removed | Use `health:local:simple` |
| `npm run health:check:local` | `npm run health:local` | ⚠️ Deprecated |
| `npm run health:simple:local` | `npm run health:local:simple` | ⚠️ Deprecated |
| `npm run health:check:dev` | `npm run health:dev` | ⚠️ Deprecated |
| `npm run health:check:test` | `npm run health:test` | ⚠️ Deprecated |
| `npm run health:check:prod` | `npm run health:prod` | ⚠️ Deprecated |

### Performance Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run test:connection-pool` | `npm run perf:connection-pool` | ⚠️ Deprecated |
| `npm run test:connection-pool:light` | `npm run perf:connection-pool:light` | ⚠️ Deprecated |
| `npm run test:connection-pool:heavy` | `npm run perf:connection-pool:heavy` | ⚠️ Deprecated |
| `npm run test:performance-monitoring` | `npm run perf:monitoring` | ⚠️ Deprecated |
| `npm run test:structured-logging` | `npm run perf:logging` | ⚠️ Deprecated |

### Cleanup Scripts
| Old Command | New Command | Status |
|-------------|-------------|--------|
| `npm run clean` | `npm run clean:all` | ⚠️ Deprecated |
| `npm run cleanup:mock` | `npm run clean:mock` | ⚠️ Deprecated |
| `npm run cleanup:ts` | `npm run clean:typescript` | ⚠️ Deprecated |

---

## 🎯 Quick Migration Examples

### Daily Development
```bash
# Before
npm run watch

# After
npm run dev:watch
```

### Run Tests
```bash
# Before
npm run jest:unit

# After
npm run test:unit
```

### Build for Production
```bash
# Before
npm run build

# After
npm run build:prod
```

### Deploy to Cloud Foundry
```bash
# Before
npm run deploy

# After
npm run deploy:cf
```

### Check Health
```bash
# Before
npm run health:check:local

# After
npm run health:local
```

---

## ⚠️ Important Notes

### Deprecated Scripts
- All old script names still work but show a deprecation warning
- They will be removed in a future version (approximately 2-4 weeks)
- Start using the new names immediately

### No Breaking Changes
- All old scripts redirect to new ones
- Your existing scripts/CI/CD will continue to work
- You'll see deprecation warnings to help with migration

### What to Update
1. **Local scripts**: Update your personal scripts/aliases
2. **Documentation**: Update any project documentation
3. **CI/CD pipelines**: Update deployment scripts
4. **Team communication**: Inform your team about the changes

---

## 📖 Full Documentation

See `package.json.md` for complete documentation of all scripts.

---

## 🆘 Need Help?

```bash
# See all available categories
npm run help

# See ALL commands at once
npm run help:all

# See specific category help
npm run dev:help
npm run build:help
npm run test:help
npm run db:help
npm run deploy:help
npm run health:help
npm run perf:help
npm run clean:help
```

---

## ✅ Benefits of New Structure

1. **Better Autocompletion**: Type `npm run dev:<TAB>` to see all dev options
2. **Clear Categorization**: Easy to find related scripts
3. **Consistent Naming**: All scripts follow the same pattern
4. **Built-in Help**: Each category has its own help command
5. **Better Onboarding**: New team members can discover scripts easily

---

## 📅 Timeline

- **Today**: New structure implemented with deprecation warnings
- **Week 1-2**: Team migration period (update your workflows)
- **Week 3-4**: Deprecation warnings remain active
- **After 4 weeks**: Old script names will be removed

---

## 🎉 Thank You!

Thank you for helping improve the developer experience of this project!

