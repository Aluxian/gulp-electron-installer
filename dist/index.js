// Generated by CoffeeScript 1.9.3
var InstallerFactory, Promise, fs, path, temp, utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Promise = require('bluebird');

fs = require('fs-extra');

path = require('path');

temp = require('temp');

utils = require('./utils');

InstallerFactory = (function() {
  function InstallerFactory(opts) {
    this.renameSetupFile = bind(this.renameSetupFile, this);
    this.packRelease = bind(this.packRelease, this);
    this.syncReleases = bind(this.syncReleases, this);
    var appMetadata;
    if (!opts.appDirectory) {
      throw new Error('Please provide the "appDirectory" config parameter.');
    }
    appMetadata = utils.getPackageJson(opts.appDirectory);
    this.appDirectory = opts.appDirectory;
    this.outputDirectory = path.resolve(opts.outputDirectory || 'installer');
    this.loadingGif = opts.loadingGif ? path.resolve(opts.loadingGif) : path.resolve(__dirname, 'resources', 'install-spinner.gif');
    this.authors = opts.authors || appMetadata.author || '';
    this.owners = opts.owners || this.authors;
    this.name = appMetadata.name;
    this.productName = appMetadata.productName || this.name;
    this.exe = opts.exe || this.name + '.exe';
    this.setupExe = opts.setupExe || this.productName + 'Setup.exe';
    this.iconUrl = opts.iconUrl || '';
    this.description = opts.description || appMetadata.description || '';
    this.version = opts.version || appMetadata.version || '';
    this.title = opts.title || this.productName || this.name;
    this.certificateFile = opts.certificateFile;
    this.certificatePassword = opts.certificatePassword;
    this.signWithParams = opts.signWithParams;
    this.setupIcon = opts.setupIcon;
    this.remoteReleases = opts.remoteReleases;
    if (!this.authors) {
      throw new Error('Authors required: set "authors" in options or "author" in package.json');
    }
  }

  InstallerFactory.prototype.syncReleases = function() {
    var args, cmd;
    if (this.remoteReleases) {
      cmd = path.resolve(__dirname, 'vendor', 'SyncReleases.exe');
      args = ['-u', this.remoteReleases, '-r', this.outputDirectory];
      return utils.exec(cmd, args);
    } else {
      return Promise.resolve();
    }
  };

  InstallerFactory.prototype.packRelease = function() {
    var args, cmd, nupkgPath;
    nupkgPath = path.join(this.nugetOutput, this.name + "." + this.version + ".nupkg");
    cmd = path.resolve(__dirname, 'vendor', 'Squirrel.exe');
    args = ['--releasify', nupkgPath, '--releaseDir', this.outputDirectory, '--loadingGif', this.loadingGif];
    if (this.signWithParams) {
      args.push('--signWithParams');
      args.push('\"' + this.signWithParams + '\"');
    } else if (this.certificateFile && this.certificatePassword) {
      args.push('--signWithParams');
      args.push("\"/a /f \"\"" + (path.resolve(this.certificateFile)) + "\"\" /p \"\"" + this.certificatePassword + "\"\"\"");
    }
    if (this.setupIcon) {
      args.push('--setupIcon');
      args.push(path.resolve(this.setupIcon));
    }
    return utils.exec(cmd, args);
  };

  InstallerFactory.prototype.renameSetupFile = function() {
    var newSetupPath, oldSetupPath;
    oldSetupPath = path.join(this.outputDirectory, 'Setup.exe');
    newSetupPath = path.join(this.outputDirectory, this.setupExe);
    fs.renameSync(oldSetupPath, newSetupPath);
    return Promise.resolve();
  };

  InstallerFactory.prototype.createInstaller = function() {
    var args, cmd, nuspecContent, squirrelExePath, targetNuspecPath, updateExePath;
    squirrelExePath = path.resolve(__dirname, 'vendor', 'Squirrel.exe');
    updateExePath = path.join(this.appDirectory, 'Update.exe');
    fs.copySync(squirrelExePath, updateExePath);
    this.nugetOutput = temp.mkdirSync('squirrel-installer-');
    targetNuspecPath = path.join(this.nugetOutput, this.name + '.nuspec');
    nuspecContent = utils.getNuSpec(this);
    fs.writeFileSync(targetNuspecPath, nuspecContent);
    cmd = path.resolve(__dirname, 'vendor', 'nuget.exe');
    args = ['pack', targetNuspecPath, '-BasePath', path.resolve(this.appDirectory), '-OutputDirectory', this.nugetOutput, '-NoDefaultExcludes'];
    return utils.exec(cmd, args).then(this.syncReleases).then(this.packRelease).then(this.renameSetupFile);
  };

  return InstallerFactory;

})();

module.exports = function(opts) {
  var error;
  try {
    return new InstallerFactory(opts).createInstaller();
  } catch (_error) {
    error = _error;
    return Promise.reject(error);
  }
};
