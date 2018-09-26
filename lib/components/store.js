class Store {
  constructor(taskId) {
    this.taskId = taskId;

    // if (this.cfg.autoCommit) {
    //   this.enableAutoCommit();
    // }
  }

  enableAutoCommit() {
    this.autoCommitor = setTimeout(async () => {
      await this.commit();
      this.enableAutoCommit();
    }, this.cfg.autoCommitFrequency * 1000);
  }

  disableAutoCommit() {
    clearTimeout(this.autoCommitor);
    this.autoCommitor = null;
  }
}

module.exports = Store;