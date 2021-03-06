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

Number.prototype.number_with_delimiter = function(delimiter) {
  var number = this + '', delimiter = delimiter || ',';
  var split = number.split('.');
  split[0] = split[0].replace(
      /(\d)(?=(\d\d\d)+(?!\d))/g,
      '$1' + delimiter
  );
  return split.join('.');
};

(function($) {
  window.TwitterSearch = function(applicationID, apiKey, indexName) {
    this.init(applicationID, apiKey, indexName);
  }

  TwitterSearch.prototype = {
    init: function(applicationID, apiKey, indexName) {
      var self = this;

      this.client = new AlgoliaSearch(applicationID, apiKey, null, true, [applicationID + '-2.algolia.io', applicationID + '-3.algolia.io']);
      this.idx = this.client.initIndex(indexName);
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

      this.client.startQueriesBatch();
      if (this.page === 0) {
        // top-users query, disable 2-typos
        this.client.addQueryInBatch(this.idx.indexName, query, { hitsPerPage: 1000, tagFilters: ["top"], minWordSizefor2Typos: 100, getRankingInfo: 1, minWordSizefor1Typo: 4 });
      }
      this.client.addQueryInBatch(this.idx.indexName, query, { hitsPerPage: 25, page: p });
      var self = this;
      this.client.sendQueriesBatch(function(success, content) { self.searchCallback(success, content); });
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
      window.location.href = 'https://twitter.com/' + this.currentHit.data('screen_name');
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

    searchCallback: function(success, answer) {
      if (!success) {
        console.log(answer);
        return;
      }

      var res = '';
      var ids = {};
      for (var j = 0; j < answer.results.length; ++j) {
        var content = answer.results[j];
        if (j === 0) {
          if (content.query.trim() != $('#inputfield input').val().trim()) {
            return;
          }
          if (this.page != 0 && this.page >= content.page) {
            return;
          }
          this.page = content.page;
        }
        for (var i = 0; i < content.hits.length; ++i) {
          var hit = content.hits[i];
          if (hit.objectID in ids) {
            continue;
          }
          ids[hit.objectID] = true;

          // skip top-users with typo and description match only
          if (j === 0 && answer.results.length === 2 && hit._rankingInfo.nbTypos > 0 && hit._highlightResult.description.matchedWords.length > 0 && hit._highlightResult.screen_name.matchedWords.length === 0 && hit._highlightResult.name.matchedWords.length === 0) {
            continue;
          }

          // skip top-users with description match only and query of 1 letter
          if (j === 0 && answer.results.length === 2 && content.query.length === 1 && hit._highlightResult.description.matchedWords.length > 0 && hit._highlightResult.screen_name.matchedWords.length === 0 && hit._highlightResult.name.matchedWords.length === 0) {
            continue;
          }

          // look & feel
          var classes = ['hit'];
          /// cosmetics
          if ((i % 2) == 1) {
            classes.push('odd');
          }

          // content
          res +=  '<div class="' + classes.join(' ') + '" data-screen_name="' + hit.screen_name + '">' +
            '  <div class="screen_name pull-right"><a class="btn btn-twitter" href="https://twitter.com/intent/user?screen_name=' + hit.screen_name + '" target="_blank"><span>@' + hit._highlightResult.screen_name.value + '</span></a></div>' +
            '  <div class="name pull-left">' + (hit._highlightResult.name ? hit._highlightResult.name.value : '') + '</div>' +
            '  <div class="clearfix"></div>' +
            '  <div class="followers_count text-right">';
          if (hit.followers_count > 0) {
            res += hit.followers_count.number_with_delimiter() + ' follower' + (hit.followers_count > 1 ? 's' : '');
          }
          res += '  </div>' +
            '  <div class="description">' + (hit._highlightResult.description ? hit._highlightResult.description.value : '') + '</div>' +
            '</div>';
        }
      }
      if (this.page === 0) {
        this.$hits.html(res);
      } else {
        this.$hits.append(res);
      }
    }

  }
})(jQuery);
