// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or vendor/assets/javascripts of plugins, if any, can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/sstephenson/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery
//= require jquery_ujs
//= require bootstrap
//= require algolia/algoliasearch.min
//= require_tree .

(function($) {
  window.TwitterSearch = function(applicationID, apiKey, indexName) {
    this.init(applicationID, apiKey, indexName);
  }

  TwitterSearch.prototype = {
    init: function(applicationID, apiKey, indexName) {
      var self = this;

      this.idx = new AlgoliaSearch(applicationID, apiKey).initIndex(indexName);
      this.$hits = $('#hits');
      this.page = 0;
      this.currentHit = null;

      $(window).scroll(function () {
        if ($(window).scrollTop() >= $(document).height() - $(window).height() - 10) {
          self.search(self.page + 1);
        }
      });

      $('#inputfield input').keyup(function(e) {
        switch (e.keyCode) {
          case 13: return self.goCurrent();
          case 27: $('#inputfield input').val(''); break;
          case 37: return self.goLeft();
          case 38: return self.goUp();
          case 39: return self.goRight();
          case 40: return self.goDown();
          default: break;
        }
        self.page = 0;
        self.currentHit = null;
        self.search(0);
      }).focus();

      // resolve DNS
      this.idx.search('', function(success, content) { });
    },

    search: function(p) {
      if ((this.page > 0 && p <= this.page) || this.page > 50) {
        // hard limit
        return;
      }

      var query = $('#inputfield input').val().trim();
      if (query.length == 0) {
        this.$hits.empty();
        return;
      }

      var self = this;
      this.idx.search(query, function(success, content) { self.searchCallback(success, content); }, { hitsPerPage: 25, page: p, getRankingInfo: 1 });
    },

    goLeft: function() {
    },

    goRight: function() {
    },

    goDown: function() {
      if (!this.go('next')) {
        this.search(this.page + 1);
      }
    },

    goUp: function() {
      if (!this.go('prev')) {
        this.currentHit.removeClass('active');
        this.currentHit = null;
      }
    },

    goCurrent: function() {
      if (!this.currentHit) return;
      window.location.href = 'http://news.ycombinator.com/item?id=' + this.currentHit.data('id');
    },

    go: function(selectFunction) {
      if (!this.currentHit) {
        this.currentHit = $(this.$hits.children('.hit:first-child')[0]);
      } else {
        var next = this.currentHit[selectFunction]();
        if (next.length == 0) {
          return false;
        }  
        this.currentHit.removeClass('active');
        this.currentHit = next;
      }      
      this.currentHit.addClass('active');
      var target = this.currentHit.offset().top - this.$hits.offset().top;
      $('html, body').scrollTop(target);
      return true;
    },

    searchCallback: function(success, content) {
      if (!success) {
        console.log(content);
        return;
      }

      if (content.query.trim() != $('#inputfield input').val().trim()) {
        return;
      }
      if (this.page != 0 && this.page >= content.page) {
        return;
      }
      this.page = content.page;
      var res = '';
      for (var i = 0; i < content.hits.length; ++i) {
        var hit = content.hits[i];

        // look & feel
        var classes = ['hit'];
        /// cosmetics
        if ((i % 2) == 1) {
          classes.push('odd');
        }

        // content
        res +=  '<div class="' + classes.join(' ') + '" data-id="' + hit.objectID + '">' +
          '  <div class="screen_name pull-right">@' + hit._highlightResult.screen_name.value + '</div>' +
          '  <div class="name pull-left">' + hit._highlightResult.name.value + '</div>' +
          '  <div class="clearfix"></div>' +
          '  <div class="followers_count text-right">' + hit.followers_count + ' follower' + (hit.followers_count > 1 ? 's' : '') + '</div>' +
          '  <div class="description">' + (hit._highlightResult.description ? hit._highlightResult.description.value : '') + '</div>' +
          '</div>';
      }
      if (content.page === 0) {
        this.$hits.html(res);
      } else {
        this.$hits.append(res);
      }
    }

  }
})(jQuery);

