# Execution Guide

This guide provides the necessary commands to run the SAP CAP ShiftBook application and execute tests.

## Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher)
- SAP Cloud Application Programming Model CLI (`@sap/cds-dk`)
- TypeScript support

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

## Running the Application

### Development Mode

1. **Start the CAP server with watch mode:**
   ```bash
   cds watch
   ```
   
   This command will:
   - Start the server on `http://localhost:4004`
   - Watch for file changes and automatically restart
   - Use TypeScript compilation with `tsx`
   - Serve the ShiftBookService at `/shiftbook/ShiftBookService`

2. **Alternative start command:**
   ```bash
   npm start
   ```

### Production Mode

1. **Build for production:**
   ```bash
   npx cds build --production
   ```

2. **Start production server:**
   ```bash
   npx cds serve
   ```

## Service Endpoints

Once the server is running, you can access:

- **Service Root:** `http://localhost:4004/shiftbook/ShiftBookService`
- **Metadata:** `http://localhost:4004/shiftbook/ShiftBookService/$metadata`
- **Welcome Page:** `http://localhost:4004/`

### Available Entities:
- `ShiftBookCategory` - Category management
- `ShiftBookCategoryMail` - Email recipients per category
- `ShiftBookCategoryLng` - Category translations
- `ShiftBookLog` - Shift log entries

### Available Actions:
- `createCategoryWithDetails` - Create category with translations and emails
- `updateCategoryWithDetails` - Update category with full details
- `deleteCategoryCascade` - Delete category and all related data
- `advancedCategorySearch` - Search categories by query
- `advancedLogSearch` - Search log entries by query
- `batchInsertMails` - Insert multiple emails for a category
- `batchInsertTranslations` - Insert multiple translations for a category
- `sendMailByCategory` - Send email to category recipients (simulated)
- `getMailRecipients` - Get email recipients for a category

## Running Tests

### End-to-End Tests

1. **Ensure the server is running:**
   ```bash
   cds watch
   ```

2. **Run all tests:**
   ```bash
   npx jest
   ```

3. **Run tests with additional options:**
   ```bash
   npx jest --runInBand --detectOpenHandles --forceExit
   ```

4. **Run tests in watch mode:**
   ```bash
   npx jest --watch
   ```

5. **Run specific test file:**
   ```bash
   npx jest test/shiftbook.e2e.test.js
   ```

### Test Coverage

- **Generate coverage report:**
  ```bash
  npx jest --coverage
  ```

## VS Code Tasks

The project includes VS Code tasks for easier development:

1. **Start CDS Watch:**
   - Use VS Code Command Palette: `Tasks: Run Task` → `cds watch`

2. **Start CDS Serve:**
   - Use VS Code Command Palette: `Tasks: Run Task` → `cds serve`

## Debugging

### TypeScript Debugging

The project is configured for TypeScript debugging with:
- Source maps enabled
- tsx runtime for TypeScript execution
- VS Code debugging configuration (if available)

### Server Logs

Monitor server logs for:
- Request/response information
- Error messages
- Email simulation logs
- Database operations

## Database

The application uses:
- **Development:** SQLite in-memory database
- **Production:** Configurable via CDS bindings

### Database Commands

1. **Deploy database:**
   ```bash
   cds deploy
   ```

2. **Reset database:**
   ```bash
   cds deploy --to sqlite --dry-run
   ```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -i :4004
   kill -9 <PID>
   ```

2. **TypeScript compilation errors:**
   ```bash
   npx tsc --noEmit
   ```

3. **Clear node modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Restart CAP server:**
   - Stop current process (Ctrl+C)
   - Run `cds watch` again

### Test Failures

1. **Server not running:**
   - Ensure `cds watch` is running
   - Check port 4004 is available

2. **Database issues:**
   - Restart server to reset in-memory database
   - Check entity names in handlers

3. **Network timeouts:**
   - Increase Jest timeout in test configuration
   - Check server responsiveness

## Performance Monitoring

Monitor application performance by checking:
- Response times in server logs
- Memory usage
- Database query performance
- Test execution times

## Environment Variables

Configure the application using:
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (default: 4004)
- `CDS_CONFIG` - CDS configuration overrides
