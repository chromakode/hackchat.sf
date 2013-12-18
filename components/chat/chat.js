module.exports = {
  tagName: "div",
  className: "chat",
  lineTemplate: _.template('<li class="message"><span class="date"><%= d.date %></span><span class="author"><%= d.author %></span><span class="text"><%- d.text %></span></li>', null, {variable: 'd'}),

  client: function() {
    this.$input = this.$('.new-message input[type="text"]')

    this.$renderedLines = $(document.createDocumentFragment())
    this.displayLines = _.debounce(this._displayLines, 0)
  },

  focus: function() {
    this.$input.focus()
  },

  renderLine: function(msg) {
    this.$renderedLines.append(this.lineTemplate({
      date: new Date(msg.ts).toLocaleTimeString(),
      author: msg.user,
      text: msg.text
    }))
    this.displayLines()
  },

  _displayLines: function() {
    var $log = this.$('.log'),
        scrollBottom = $log.prop('scrollHeight') - $log.innerHeight(),
        atBottom = Math.abs($log.scrollTop() - scrollBottom) < 5

    $log.append(this.$renderedLines)
    this.$renderedLines.empty()

    if (atBottom) {
      $log.scrollTop($log.prop('scrollHeight'))
    }
  },

}
