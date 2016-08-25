/**
 * OneAPM agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : ['租租车APP超级缓存nodejs服务'],
  /**
   * Your OneAPM license key.
   */
  license_key : 'AFEIVVICDw99b1fSSQpHCghNC0e468wOXUpXBAcOTaed2FVQH1dQTVcIfdaeUwdLVQcbClA=',
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to OneAPM when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info'
  },
  transaction_events: {
        enabled: true
  }
};
