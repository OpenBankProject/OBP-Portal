# End-to-End Testing Setup

This directory contains comprehensive end-to-end tests for the OBP Portal application.

## Test Frameworks

### Playwright (Recommended)
The project is already configured with Playwright for E2E testing. These tests are located in:
- `login-button.test.ts` - Comprehensive login button functionality tests

To run Playwright tests:
```bash
npm run test:e2e
```

### Selenium WebDriver (Alternative)
For those who prefer traditional Selenium WebDriver, we also provide:
- `selenium-login-button.test.js` - Same test coverage using Selenium

#### Selenium Setup

1. Install Selenium dependencies:
```bash
npm install --save-dev selenium-webdriver chai mocha chromedriver
```

2. Make sure you have Chrome browser installed on your system.

3. Run Selenium tests:
```bash
# Run with Mocha
npx mocha e2e/selenium-login-button.test.js --timeout 30000

# Or add to package.json scripts:
# "test:selenium": "mocha e2e/selenium-login-button.test.js --timeout 30000"
```

## Test Coverage

Both test suites cover the following login button functionality:

### Core Functionality
- ✅ Button visibility and rendering
- ✅ Correct CSS styling and classes
- ✅ Navigation to OAuth login endpoint (`/login/obp`)
- ✅ Proper button text content
- ✅ Link href attribute validation

### Accessibility
- ✅ Keyboard navigation (Tab + Enter)
- ✅ Focus management
- ✅ Screen reader compatibility

### Responsive Design
- ✅ Mobile viewport testing (375x667)
- ✅ Desktop viewport testing (1920x1080)
- ✅ Responsive CSS classes (`w-full`, `sm:w-1/2`)

### User Experience
- ✅ Hover interactions
- ✅ Button interaction states
- ✅ Page layout structure validation
- ✅ Load performance testing

### Page Structure
- ✅ Login page title display
- ✅ Container styling and backdrop effects
- ✅ Layout responsiveness

## Configuration

### Playwright Configuration
The Playwright configuration is in `playwright.config.ts` at the project root:
- Web server runs on port 4173
- Tests build and preview the application before running

### Selenium Configuration
The Selenium tests are configured to:
- Use Chrome WebDriver
- Connect to `http://localhost:4173` (adjust BASE_URL as needed)
- 30-second timeout for test operations
- Automatic driver cleanup after each test

## Running Tests

### Development Server
Before running tests, make sure your development server is running:

```bash
# For Playwright (automatic)
npm run test:e2e

# For Selenium (manual server start)
npm run build && npm run preview
# Then in another terminal:
npx mocha e2e/selenium-login-button.test.js --timeout 30000
```

### CI/CD Integration
Both test suites can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests (Playwright)
  run: npm run test:e2e

- name: Run E2E Tests (Selenium)
  run: |
    npm run build
    npm run preview &
    sleep 5
    npx mocha e2e/selenium-login-button.test.js --timeout 30000
```

## Browser Support

### Playwright
- Chromium, Firefox, Safari (WebKit)
- Mobile browsers simulation
- Configurable in `playwright.config.ts`

### Selenium
- Chrome (default configuration)
- Can be extended for Firefox, Safari, Edge
- Requires appropriate WebDriver binaries

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 4173 is available or update BASE_URL
2. **ChromeDriver version**: Make sure ChromeDriver matches your Chrome version
3. **Timeouts**: Increase timeout values for slower environments
4. **Element not found**: Wait for elements to load before interacting

### Debug Mode

For Playwright:
```bash
npx playwright test --debug
```

For Selenium:
```bash
# Add --inspect flag to Node.js
node --inspect node_modules/.bin/mocha e2e/selenium-login-button.test.js --timeout 30000
```

## Adding New Tests

When adding new E2E tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include proper setup/teardown
4. Test both happy path and edge cases
5. Consider accessibility and responsive design
6. Add appropriate waits for async operations

## Dependencies

### Playwright (Already Installed)
- `@playwright/test`: ^1.49.1

### Selenium (Optional)
- `selenium-webdriver`: Latest
- `chai`: Latest
- `mocha`: Latest
- `chromedriver`: Latest

Run `npm install --save-dev selenium-webdriver chai mocha chromedriver` to add Selenium support.