"use strict";

module.exports = { 
  events: {
    'click .log': 'handleFocus',
    'submit .new-message': 'handleSend'
  },

  handleFocus: function() {
    this.focus();
  },

  handleSend: function() {
    SF.controller().send(this.$input.val());
    this.$input.val('');
    return false;
  }
};
