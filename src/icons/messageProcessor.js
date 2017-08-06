const taskGenerator = require('./taskGenerator');
const IconTemplate = taskGenerator.IconTemplate;
const Query = taskGenerator.Query;
const Task = taskGenerator.Task;
const aws = require('./aws');
const iconGenerator = require('./iconGenerator');

function processMessage(text, done) {
  // A message should always have a type. Either 'query' or 'task'
  console.log(text);
  const obj = JSON.parse(text);
  if (obj.type === 'query') {
    const query = objectToQuery(obj);
    processQuery(query, done);
  } else if (obj.type === 'task') {
    const task = objectToTask(obj);
    processTask(task, done);
  }
}

function objectToQuery(obj) {
  return new Query(obj.from, obj.to);
}

function objectToTask(obj) {
  return new Task(new IconTemplate(obj.device, obj.width, obj.height, obj.filename), obj.from, obj.to);
}

/**
 * Generate all tasks.
 * For each task, check for object existence.
 * Post task to queue if object doesn't exist.
 * @param {Query} query 
 * @param {function} done
 */
function processQuery(query, done) {
  const tasks = taskGenerator.generateTasks(query);
  const tasksThatNeedToRun = [];
  tasks.forEach(task => {
    aws.objectExists(task.s3Key, function(exists) {
      if (!exists) aws.sendMessage(task);
    });
  });
  done();
}

/**
 * 
 * @param {Task} task 
 * @param {function} done
 */
function processTask(task, done) {
  console.log(`generating image from queue: ${task.s3Key}`);
  const image = iconGenerator.generateIcon(task);
  aws.putObject(task.s3Key, image, function(err, data) {
    if (err) done(err);
    else {
      done();
    }
  });
}

module.exports = { processMessage };