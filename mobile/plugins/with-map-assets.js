const { CodeGenerator, withAppDelegate, withXcodeProject } = require('expo/config-plugins');

module.exports = (config) => {
  config = withAppDelegate(config, (mod) => {
    let source = mod.modResults.contents;
    if (!source.includes('import MapLibre')) {
      if (!source.includes('import React\n')) {
        throw new Error('Cannot add MapLibre import: missing "import React" anchor in AppDelegate.');
      }
      source = source.replace('import React\n', 'import React\nimport MapLibre\n');
    }
    mod.modResults.contents = CodeGenerator.mergeContents({
      tag: 'binwhere-initial-map-style', src: source,
      anchor: /let delegate = ReactNativeDelegate\(\)/, offset: 0, comment: '//',
      newSrc: `    let mapOptions = MLNSettings.tileServerOptions!
    let initialMapStyle = MLNDefaultStyle()
    initialMapStyle.url = Bundle.main.url(forResource: "initial-style", withExtension: "json", subdirectory: "map-assets")!
    initialMapStyle.name = "BinWhere"
    initialMapStyle.version = 8
    mapOptions.defaultStyles = [initialMapStyle]
    mapOptions.defaultStyle = initialMapStyle
    MLNSettings.tileServerOptions = mapOptions`,
    }).contents;
    return mod;
  });
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const file = project.addResourceFile('../assets/map-assets', {
      target: project.getFirstTarget().uuid,
      lastKnownFileType: 'folder',
    }, project.getFirstProject().firstProject.mainGroup);
    if (file) {
      project.pbxFileReferenceSection()[file.fileRef] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'folder',
        path: '"../assets/map-assets"',
        sourceTree: 'SOURCE_ROOT',
      };
    }
    return mod;
  });
};
