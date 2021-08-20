const Console = require("../utils/console");
const SessionCommand = require("../utils/SessionCommand");
const socket = require("../managers/socket.js");

const createServer = require("../managers/server");

class Exercise {
  constructor(exercise) {
    this.exercise = exercise;
  }

  test(sessionConfig, config, socket) {
    if (this.exercise.language) {
      socket.log(
        "testing",
        `Testing exercise ${this.exercise.slug} using ${this.exercise.language} engine`
      );

      sessionConfig.runHook("action", {
        action: "test",
        socket,
        configuration: config,
        exercise: this.exercise,
      });
    } else {
      socket.onTestingFinised({ result: "success" });
    }
  }
}

class ExercisesQueue {
  constructor(exercises) {
    this.exercises = exercises.map((exercise) => {
      return new Exercise(exercise);
    });
  }

  pop() {
    return this.exercises.shift();
  }

  isEmpty() {
    return this.size() === 0;
  }

  size() {
    return this.exercises.length;
  }
}

class TestCommand extends SessionCommand {
  async init() {
    const { flags } = this.parse(TestCommand);
    await this.initSession(flags);
  }
  async run() {
    const {
      args: { exerciseSlug },
    } = this.parse(TestCommand);

    // Build exercises index
    this.configManager.buildIndex()

    let exercises = [];

    // test all exercises
    if (!exerciseSlug) {
      exercises = this.configManager.getAllExercises();
    } else {
      exercises = [this.configManager.getExercise(exerciseSlug)];
    }

    const exercisesQueue = new ExercisesQueue(exercises);

    const configObject = this.configManager.get();
    configObject.config.port = 5000;
    configObject.config.test = true;
    configObject.config.testingMultiple = !exerciseSlug;

    let hasFailed = false;
    let failedTestsCount = 0;
    let successTestsCount = 0;
    let testsToRunCount = exercisesQueue.size();

    configObject.config.testingFinishedCallback = ({ result }) => {
      if (result === "failed") {
        hasFailed = true;
        failedTestsCount++;
      } else {
        successTestsCount++;
      }

      if (exercisesQueue.isEmpty()) {
        Console.info(
          `${testsToRunCount} test${testsToRunCount > 1 ? "s" : ""} runned`
        );
        Console.success(
          `${successTestsCount} test${successTestsCount > 1 ? "s" : ""} passed`
        );
        Console.error(
          `${failedTestsCount} test${failedTestsCount > 1 ? "s" : ""} failed`
        );

        process.exit(hasFailed ? 1 : 0);
      } else {
        exercisesQueue.pop().test(this.config, config, socket);
      }
    };

    const { config } = configObject;

    const server = await createServer(configObject, this.configManager);

    socket.start(config, server);

    exercisesQueue.pop().test(this.config, config, socket);
  }
}

TestCommand.description = `Test exercises`;

TestCommand.args = [
  {
    name: "exerciseSlug",
    required: false,
    description: "The name of the exercise to test",
    hidden: false,
  },
];

module.exports = TestCommand;
