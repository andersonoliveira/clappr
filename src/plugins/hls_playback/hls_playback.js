// Copyright 2014 Globo.com Player authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

//FIXME review this require approach.
var UIObject = require('../../base/ui_object');
var Styler = require('../../base/styler');
var JST = require('../../base/jst');
var _ = require("underscore");

var HLSVideoPlaybackPlugin = UIObject.extend({
  pluginName: 'hls_playback',
  attributes: {
    'data-hls-playback': ''
  },
  tagName: 'object',
  template: JST.hls_playback,
  initialize: function(options) {
    this.el.src = options.src;
    this.el.id = this.cid;
    this.swfPath = options.swfPath || "assets/HLSPlayer.swf";
    this.container.settings = {
      left: ["playstop"],
      right: ["fullscreen", "volume"]
    };
    this.autoPlay = options.autoPlay;
    this.listenTo(this.container, 'container:play', this.play);
    this.listenTo(this.container, 'container:pause', this.pause);
    this.listenTo(this.container, 'container:stop', this.stop);
    this.listenTo(this.container, 'container:seek', this.seek);
    this.listenTo(this.container, 'container:volume', this.volume);
    this.listenTo(this.container, 'container:fullscreen', this.fullscreen);
    this.listenTo(this.container, 'container:destroyed', this.containerDestroyed);
    this.render();
    this.checkIfFlashIsReady();
  },
  bootstrap: function() {
    clearInterval(this.bootstrapId);
    this.currentState = "IDLE";
    this.timedCheckState();
    this.autoPlay && this.container.play();
  },
  checkIfFlashIsReady: function() {
    this.bootstrapId = setInterval(function() {
      if(this.el.getState) {
        this.bootstrap();
      }
    }.bind(this), 50);
  },
  updateTime: function(interval) {
    return setInterval(function() {
      var time = (100 / (this.el.getDuration() || 1)) * (this.el.getPosition() || 0);
      this.container.timeUpdated(time);
    }.bind(this), interval);
  },
  play: function() {
    if(this.el.getState() === 'IDLE') {
      this.id = this.updateTime(1000);
    }
    if(this.el.getState() === 'PAUSED') {
      this.el.resume();
    } else {
      this.firstPlay();
    }
  },
  timedCheckState: function() {
    this.checkStateId = setInterval(this.checkState.bind(this), 250);
  },
  checkState: function() {
    if (this.el.getState() === "PLAYING_BUFFERING" && this.el.getbufferLength() < 1) {
      this.container.buffering();
      this.currentState = "PLAYING_BUFFERING";

    } else if (this.currentState === "PLAYING_BUFFERING" && this.el.getState() === "PLAYING") {
      this.container.bufferfull();
      this.currentState = "PLAYING";

    } else if (this.el.getState() === "IDLE") {
      this.currentState = "IDLE";
    }
  },
  firstPlay: function() {
    this.el.load(this.el.src);
    this.el.play();
  },
  volume: function(value) {
    this.el.volume(value);
  },
  pause: function() {
    this.el.pause();
  },
  stop: function() {
    this.el.stop();
    clearInterval(this.id);
    this.container.timeUpdated(0);
  },
  seek: function(time) {
    clearInterval(this.id);
    this.el.seek(this.el.getDuration() * (time / 100));
    this.id = this.updateTime(1000);
  },
  timeUpdate: function(time) {
    this.container.timeUpdated(time);
  },
  containerDestroyed: function() {
    console.log('container destroyed');
    clearInterval(this.id);
    clearInterval(this.checkStateId);
  },
  render: function() {
    var style = Styler.getStyleFor(this.pluginName);
    this.$el.html(this.template({swfPath: this.swfPath}));
    this.$el.append(style);
    this.container.$el.append(this.el);
    return this;
  }
});

HLSVideoPlaybackPlugin.canPlay = function(resource) {
  return !!resource.match(/(.*).m3u8/);
}


module.exports = HLSVideoPlaybackPlugin;
