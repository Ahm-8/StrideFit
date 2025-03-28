const wdio = require('webdriverio');

const opts = {
    path: '/wd/hub',
    port: 4723,
    capabilities: {
        platformName: 'Android',
        platformVersion: '11.0',
        deviceName: 'Android Emulator',
        app: '/path/to/your/app.apk',
        automationName: 'UiAutomator2'
    }
};

describe('Appium Test', () => {
    let driver;

    before(async () => {
        driver = await wdio.remote(opts);
    });

    after(async () => {
        await driver.deleteSession();
    });

    it('should display the app title', async () => {
        const title = await driver.getTitle();
        assert.strictEqual(title, 'Expected App Title');
    });
});