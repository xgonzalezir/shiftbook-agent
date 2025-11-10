/**
 * Unit tests for CDS Folders Configuration
 * Tests CDS folder path configuration for different environments
 */

import * as cds from '@sap/cds';
import * as fs from 'fs';
import {
  configureCdsFolders,
  getCdsFolders,
  CDS_FOLDER_DEFAULTS
} from '../../../srv/loaders/cds-folders-config';

// Import Cloud Foundry diagnostics from new location
import {
  getDiagnosticInfo,
  logDiagnostics,
  isCloudFoundryEnvironment
} from '../../../srv/loaders/cloudfoundry-diagnostics';

// Mock fs module
jest.mock('fs');

describe('CDS Folders Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment and cds.env
    process.env = { ...originalEnv };
    Object.defineProperty(cds, 'env', {
      value: {
        folders: {
          app: '/test/app',
          db: '/test/db',
          srv: '/test/srv',
          fts: '/test/fts'
        }
      },
      writable: true,
      configurable: true
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('configureCdsFolders', () => {
    test('should configure folders for local development', () => {
      delete process.env.VCAP_APPLICATION;
      delete process.env.CDS_FOLDERS_SRV;
      delete process.env.CDS_FOLDERS_DB;

      const config = configureCdsFolders();

      expect(config.srv).toBe('./srv');
      expect(config.db).toBe('./db');
      expect(cds.env.folders.srv).toBe('./srv');
      expect(cds.env.folders.db).toBe('./db');
    });

    test('should configure folders for Cloud Foundry', () => {
      process.env.VCAP_APPLICATION = 'true';
      delete process.env.CDS_FOLDERS_SRV;
      delete process.env.CDS_FOLDERS_DB;

      const config = configureCdsFolders();

      expect(config.srv).toBe('.');
      expect(config.db).toBe('../db');
      expect(cds.env.folders.srv).toBe('.');
      expect(cds.env.folders.db).toBe('../db');
    });

    test('should use environment variable for srv folder', () => {
      process.env.CDS_FOLDERS_SRV = '/custom/srv';

      const config = configureCdsFolders();

      expect(config.srv).toBe('/custom/srv');
      expect(cds.env.folders.srv).toBe('/custom/srv');
    });

    test('should use environment variable for db folder', () => {
      process.env.CDS_FOLDERS_DB = '/custom/db';

      const config = configureCdsFolders();

      expect(config.db).toBe('/custom/db');
      expect(cds.env.folders.db).toBe('/custom/db');
    });

    test('should initialize folders object if not exists', () => {
      delete cds.env.folders;

      configureCdsFolders();

      expect(cds.env.folders).toBeDefined();
    });
  });

  describe('getDiagnosticInfo', () => {
    test('should return null for non-Cloud Foundry environment', () => {
      delete process.env.VCAP_APPLICATION;

      const info = getDiagnosticInfo();

      expect(info).toBeNull();
    });

    test('should return diagnostic info in Cloud Foundry', () => {
      process.env.VCAP_APPLICATION = 'true';
      cds.env.folders = {
          srv: '/test/srv',
          db: '/test/db',
          app: '/test/app',
          fts: '/test/fts',
      };

      (fs.readdirSync as jest.Mock).mockReturnValue([
        'shiftbook-service.js',
        'other-file.js',
        'shiftbook-service-impl.js'
      ]);

      const info = getDiagnosticInfo();

      expect(info).not.toBeNull();
      expect(info?.serviceFiles).toHaveLength(2);
      expect(info?.serviceFiles).toContain('shiftbook-service.js');
      expect(info?.hasShiftbookService).toBe(true);
      expect(info?.totalFiles).toBe(3);
    });

    test('should handle no shiftbook-service files', () => {
      process.env.VCAP_APPLICATION = 'true';
        cds.env.folders = {
            srv: '/test/srv',
            db: '/test/db',
            app: '/test/app',
            fts: '/test/fts',
        };

      (fs.readdirSync as jest.Mock).mockReturnValue([
        'other-file.js',
        'another-file.js'
      ]);

      const info = getDiagnosticInfo();

      expect(info?.serviceFiles).toHaveLength(0);
      expect(info?.hasShiftbookService).toBe(false);
    });

    test('should handle directory read errors', () => {
      process.env.VCAP_APPLICATION = 'true';
      cds.env.folders = {
            srv: '/test/srv',
            db: '/test/db',
            app: '/test/app',
            fts: '/test/fts',
        };

      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Directory not found');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const info = getDiagnosticInfo();

      expect(info).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reading srv directory'),
        'Directory not found'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logDiagnostics', () => {
    test('should log diagnostics in Cloud Foundry', () => {
      process.env.VCAP_APPLICATION = 'true';
      cds.env.folders = {
            srv: '/test/srv',
            db: '/test/db',
            app: '/test/app',
            fts: '/test/fts',
        };

      (fs.readdirSync as jest.Mock).mockReturnValue(['shiftbook-service.js']);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logDiagnostics();

      expect(consoleSpy).toHaveBeenCalledWith(
        '📂 CF Diagnostics - Files in srv directory:',
        ['shiftbook-service.js']
      );

      consoleSpy.mockRestore();
    });

    test('should log warning when no files found', () => {
      process.env.VCAP_APPLICATION = 'true';
      cds.env.folders = {
            srv: '/test/srv',
            db: '/test/db',
            app: '/test/app',
            fts: '/test/fts',
        };

      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logDiagnostics();

      expect(consoleSpy).toHaveBeenCalledWith(
        '📂 CF Diagnostics - Files in srv directory:',
        '⚠️ No shiftbook-service files found!'
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING'));

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    test('should log info message when not in Cloud Foundry', () => {
      delete process.env.VCAP_APPLICATION;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logDiagnostics();

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ Not in Cloud Foundry - diagnostics skipped');

      consoleSpy.mockRestore();
    });
  });

  describe('getCdsFolders', () => {
    test('should return current CDS folders configuration', () => {
        // @ts-ignore
      cds.env.folders = { srv: '/custom/srv', db: '/custom/db' };

      const folders = getCdsFolders();

      expect(folders.srv).toBe('/custom/srv');
      expect(folders.db).toBe('/custom/db');
    });

    test('should return default folders if not set', () => {
      // @ts-ignore
        cds.env.folders = {};

      const folders = getCdsFolders();

      expect(folders.srv).toBe('./srv');
      expect(folders.db).toBe('./db');
    });

    test('should handle missing folders object', () => {
      delete cds.env.folders;

      const folders = getCdsFolders();

      expect(folders.srv).toBe('./srv');
      expect(folders.db).toBe('./db');
    });
  });

  describe('isCloudFoundryEnvironment', () => {
    test('should return true when VCAP_APPLICATION is set', () => {
      process.env.VCAP_APPLICATION = 'true';

      expect(isCloudFoundryEnvironment()).toBe(true);
    });

    test('should return false when VCAP_APPLICATION is not set', () => {
      delete process.env.VCAP_APPLICATION;

      expect(isCloudFoundryEnvironment()).toBe(false);
    });

    test('should return true for any truthy VCAP_APPLICATION value', () => {
      process.env.VCAP_APPLICATION = '{"name":"myapp"}';

      expect(isCloudFoundryEnvironment()).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete local setup', () => {
      delete process.env.VCAP_APPLICATION;
      delete process.env.CDS_FOLDERS_SRV;
      delete process.env.CDS_FOLDERS_DB;

      const config = configureCdsFolders();
      const folders = getCdsFolders();
      const isCF = isCloudFoundryEnvironment();

      expect(config).toEqual(folders);
      expect(isCF).toBe(false);
      expect(getDiagnosticInfo()).toBeNull();
    });

    test('should handle complete Cloud Foundry setup', () => {
      process.env.VCAP_APPLICATION = 'true';
      delete process.env.CDS_FOLDERS_SRV;
      delete process.env.CDS_FOLDERS_DB;

      // @ts-ignore
      cds.env.folders = {};

      (fs.readdirSync as jest.Mock).mockReturnValue(['shiftbook-service.js']);

      const config = configureCdsFolders();
      const folders = getCdsFolders();
      const isCF = isCloudFoundryEnvironment();
      const info = getDiagnosticInfo();

      expect(config.srv).toBe('.');
      expect(config.db).toBe('../db');
      expect(folders).toEqual(config);
      expect(isCF).toBe(true);
      expect(info).not.toBeNull();
      expect(info?.hasShiftbookService).toBe(true);
    });
  });

  // NOTE: Utility function tests removed
  // Functions like hasCustomCDSFolders, validateCDSFolders, describeCDSFolders, etc.
  // were removed from cds-folders-config.ts as they were not used in production code.
  // Only core configuration functions remain.

  describe('CDS_FOLDER_DEFAULTS', () => {
    test('should have local defaults', () => {
      expect(CDS_FOLDER_DEFAULTS.LOCAL.srv).toBe('./srv');
      expect(CDS_FOLDER_DEFAULTS.LOCAL.db).toBe('./db');
    });

    test('should have cloud defaults', () => {
      expect(CDS_FOLDER_DEFAULTS.CLOUD.srv).toBe('.');
      expect(CDS_FOLDER_DEFAULTS.CLOUD.db).toBe('../db');
    });
  });
});
