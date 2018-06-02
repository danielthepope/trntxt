import * as extend from 'extend';
import {Request} from 'express';

class Query {
  from: any;
  to: any;
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  toJson() {
    return JSON.stringify(extend({type: 'query'}, this));
  }
}

class IconTemplate {
  device: string;
  width: number;
  height: number;
  filename: string;
  constructor(device: string, width: number, height: number, filename: string) {
    this.device = device;
    this.width = width;
    this.height = height;
    this.filename = filename;
  }
}

class Task {
  width: number;
  height: number;
  device: string;
  filename: string;
  from: string;
  to: string;
  constructor(iconTemplate: IconTemplate, from: string, to: string) {
    this.width = iconTemplate.width;
    this.height = iconTemplate.height;
    this.device = iconTemplate.device;
    this.filename = iconTemplate.filename;
    this.from = from;
    this.to = to;
  }

  get s3Key() {
    const toPath = this.to ? `${this.to}/` : '';
    return `${this.from}/${toPath}${this.filename}`;
  }

  toJson() {
    return JSON.stringify(extend({type: 'task'}, this));
  }
}

const iconTemplates = [
  // https://developer.apple.com/ios/human-interface-guidelines/graphics/app-icon/#app-icon-sizes
  new IconTemplate('apple', 180, 180, 'apple-touch-icon-180x180.png'),
  new IconTemplate('apple', 167, 167, 'apple-touch-icon-167x167.png'),
  new IconTemplate('apple', 152, 152, 'apple-touch-icon-152x152.png'),
  new IconTemplate('apple', 120, 120, 'apple-touch-icon-120x120.png'),

  // https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher.html
  new IconTemplate('android', 36, 36, 'android-chrome-36x36.png'),
  new IconTemplate('android', 48, 48, 'android-chrome-48x48.png'),
  new IconTemplate('android', 72, 72, 'android-chrome-72x72.png'),
  new IconTemplate('android', 96, 96, 'android-chrome-96x96.png'),
  new IconTemplate('android', 144, 144, 'android-chrome-144x144.png'),
  new IconTemplate('android', 192, 192, 'android-chrome-192x192.png'),

  // https://docs.microsoft.com/en-us/windows/uwp/controls-and-patterns/tiles-and-notifications-app-assets
  // https://msdn.microsoft.com/en-us/library/dn455106%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
  // small
  // new IconTemplate('windows',71,71,'Square71x71Logo.Scale100.png'),
  // new IconTemplate('windows',89,89,'Square71x71Logo.Scale125.png'),
  // new IconTemplate('windows',107,107,'Square71x71Logo.Scale150.png'),
  new IconTemplate('windows', 142, 142, 'Square71x71Logo.Scale200.png'),
  // new IconTemplate('windows',284,284,'Square71x71Logo.Scale400.png'),
  // medium
  // new IconTemplate('windows',150,150,'Square150x150Logo.Scale100.png'),
  // new IconTemplate('windows',188,188,'Square150x150Logo.Scale125.png'),
  // new IconTemplate('windows',225,225,'Square150x150Logo.Scale150.png'),
  new IconTemplate('windows', 300, 300, 'Square150x150Logo.Scale200.png'),
  // new IconTemplate('windows',600,600,'Square150x150Logo.Scale400.png'),
  // wide
  // new IconTemplate('windows',310,150,'Wide310x150Logo.Scale100.png'),
  // new IconTemplate('windows',388,188,'Wide310x150Logo.Scale125.png'),
  // new IconTemplate('windows',465,225,'Wide310x150Logo.Scale150.png'),
  new IconTemplate('windows', 620, 300, 'Wide310x150Logo.Scale200.png'),
  // new IconTemplate('windows',1240,600,'Wide310x150Logo.Scale400.png'),
  // large
  // new IconTemplate('windows',310,310,'Square310x310Logo.Scale100.png'),
  // new IconTemplate('windows',388,388,'Square310x310Logo.Scale125.png'),
  // new IconTemplate('windows',465,465,'Square310x310Logo.Scale150.png'),
  new IconTemplate('windows', 620, 620, 'Square310x310Logo.Scale200.png'),
  // new IconTemplate('windows',1240,1240,'Square310x310Logo.Scale400.png'),
]

function generateTasks(query) {
  return iconTemplates.map(template => new Task(template, query.from, query.to));
}

function deriveTaskFromRequest(request:Request) {
  const matches = iconTemplates.filter(template => template.filename === request.params.filename);
  if (matches.length === 0) return null;
  const iconTemplate = matches[0];
  
  return new Task(iconTemplate, request.params.from, request.params.to);
}

export {
  deriveTaskFromRequest,
  generateTasks,
  Query,
  IconTemplate,
  Task
};
