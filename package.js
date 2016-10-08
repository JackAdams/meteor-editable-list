Package.describe({
  name: 'babrahams:editable-list',
  summary: 'Editable list widget for Meteor',
  version: '0.4.30',
  git: 'https://github.com/jackadams/meteor-editable-list.git'
});

Package.onUse(function(api) {
    
  api.versionsFrom('1.0');
  
  api.use('babrahams:editable-text@0.8.30', ['client','server']);
  api.imply('babrahams:editable-text');
  api.use('jquery', 'client');
  // api.use('mizzao:jquery-ui@1.11.2', 'client'); // Removed in 0.3.0 to give devs flexibility about which version of jqueryui to use, or to leave it out completely
  api.use('tracker', 'client');
  api.use('minimongo', 'client');
  api.use('templating', 'client');
  api.use('blaze', 'client');
  api.use('spacebars', 'client');
  api.use('dburles:mongo-collection-instances@0.3.5', ['client','server']);
  api.use('underscore', ['client','server']);
  api.use('mongo', ['client','server']);
  api.use('reactive-var', 'client');
  api.use('djedi:sanitize-html@1.11.3', 'server');
  api.imply('djedi:sanitize-html');
  
  api.addFiles('lib/editable-list-common.js', ['client','server']);
  api.addFiles('lib/editable-list.css','client');
  api.addFiles('lib/editable-list.html','client');
  api.addFiles('lib/editable-list.js','client');
    
  if (api.export) {
    api.export('EditableList');
  }

});

Package.onTest(function(api) {
    
  api.use('tinytest');
  api.use('babrahams:editable-list');
  api.addFiles('lib/editable-list-tests.js');
  
});
