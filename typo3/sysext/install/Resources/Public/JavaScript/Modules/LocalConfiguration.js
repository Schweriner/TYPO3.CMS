/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

/**
 * Module: TYPO3/CMS/Install/LocalConfiguration
 */
define([
  'jquery',
  'TYPO3/CMS/Install/Router',
  'TYPO3/CMS/Install/FlashMessage',
  'TYPO3/CMS/Install/ProgressBar',
  'TYPO3/CMS/Install/InfoBox',
  'TYPO3/CMS/Install/Severity',
  'TYPO3/CMS/Backend/Notification',
  'bootstrap'
], function($, Router, FlashMessage, ProgressBar, InfoBox, Severity, Notification) {
  'use strict';

  return {
    selectorModalBody: '.t3js-modal-body',
    selectorToggleAllTrigger: '.t3js-localConfiguration-toggleAll',
    selectorWriteTrigger: '.t3js-localConfiguration-write',
    selectorSearchTrigger: '.t3js-localConfiguration-search',
    selectorWriteToken: '#t3js-localConfiguration-write-token',
    selectorContentContainer: '.t3js-localConfiguration-content',
    selectorOutputContainer: '.t3js-localConfiguration-output',
    currentModal: {},

    initialize: function(currentModal) {
      var self = this;
      this.currentModal = currentModal;
      self.getContent();

      // Write out new settings
      currentModal.on('click', this.selectorWriteTrigger, function() {
        self.write();
      });

      // Expand / collapse "Toggle all" button
      currentModal.on('click', this.selectorToggleAllTrigger, function() {
        var modalContent = self.currentModal.find(self.selectorModalBody);
        var panels = modalContent.find('.panel-collapse');
        var action = (panels.eq(0).hasClass('in')) ? 'hide' : 'show';
        panels.collapse(action);
      });

      // Make jquerys "contains" work case-insensitive
      jQuery.expr[':'].contains = jQuery.expr.createPseudo(function(arg) {
        return function(elem) {
          return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
        };
      });

      // Focus search field on certain user interactions
      currentModal.on('keydown', function(e) {
        var $searchInput = currentModal.find(self.selectorSearchTrigger);
        if (e.ctrlKey || e.metaKey) {
          // Focus search field on ctrl-f
          switch (String.fromCharCode(e.which).toLowerCase()) {
            case 'f':
              e.preventDefault();
              $searchInput.focus();
              break;
          }
        } else if (e.keyCode === 27) {
          // Clear search on ESC key
          e.preventDefault();
          $searchInput.val('').focus();
        }
      });

      // Perform expand collapse on search matches
      currentModal.on('keyup', this.selectorSearchTrigger, function(e) {
        var typedQuery = $(e.target).val();
        var $searchInput = currentModal.find((self.selectorSearchTrigger));
        currentModal.find('div.item').each(function() {
          var $item = $(this);
          if ($(':contains(' + typedQuery + ')', $item).length > 0 || $('input[value*="' + typedQuery + '"]', $item).length > 0) {
            $item.removeClass('hidden').addClass('searchhit');
          } else {
            $item.removeClass('searchhit').addClass('hidden');
          }
        });
        currentModal.find('.searchhit').parent().collapse('show');
        self.handleButtonScrolling();
        // Make search field clearable
        require(['jquery.clearable'], function() {
          var searchResultShown = ('' !== $searchInput.first().val());
          $searchInput.clearable().focus();
        });
      });
    },

    getContent: function() {
      var self = this;
      var modalContent = this.currentModal.find(self.selectorModalBody);
      $.ajax({
        url: Router.getUrl('localConfigurationGetContent'),
        cache: false,
        success: function(data) {
          if (data.success === true) {
            if (Array.isArray(data.status)) {
              data.status.forEach(function(element) {
                Notification.success(element.title, element.message);
              });
            }
            modalContent.html(data.html);
          }
        },
        error: function(xhr) {
          Router.handleAjaxError(xhr);
        }
      });
    },

    write: function() {
      var self = this;
      var executeToken = self.currentModal.find(this.selectorWriteToken).text();
      var configurationValues = {};
      self.currentModal.find('.t3js-localConfiguration-pathValue').each(function(i, element) {
        var $element = $(element);
        if ($element.attr('type') === 'checkbox') {
          if (element.checked) {
            configurationValues[$element.data('path')] = '1';
          } else {
            configurationValues[$element.data('path')] = '0';
          }
        } else {
          configurationValues[$element.data('path')] = $element.val();
        }
      });
      $.ajax({
        url: Router.getUrl(),
        method: 'POST',
        data: {
          'install': {
            'action': 'localConfigurationWrite',
            'token': executeToken,
            'configurationValues': configurationValues
          }
        },
        cache: false,
        success: function(data) {
          if (data.success === true && Array.isArray(data.status)) {
            data.status.forEach(function(element) {
              Notification.showMessage(element.title, element.message, element.severity);
            });
          } else {
            Notification.error('Something went wrong');
          }
        },
        error: function(xhr) {
          Router.handleAjaxError(xhr);
        }
      });
    },

    /**
     * Fix or unfix the "Write configuration" / "Toggle all" buttons at browser window
     * bottom if a scrollbar is shown
     */
    handleButtonScrolling: function() {
      var $fixedFooterHandler = $('#fixed-footer-handler');
      if ($fixedFooterHandler.length > 0) {
        var $fixedFooter = $('#fixed-footer');
        if (!this.isScrolledIntoView($fixedFooterHandler)) {
          $fixedFooter.addClass('fixed');
          $fixedFooter.width($('.t3js-localConfiguration .panel-group').width());
        } else {
          $fixedFooter.removeClass('fixed');
        }
      }
    },

    /**
     * Helper of handleButtonScrolling()
     * See if an element is within current viewport.
     *
     * @param element
     * @returns {boolean}
     */
    isScrolledIntoView: function(element) {
      var $window = $(window);
      var docViewTop = $window.scrollTop();
      var docViewBottom = docViewTop + $window.height();
      var $elem = $(element);
      var elemTop = $elem.offset().top;
      var elemBottom = elemTop + $elem.height();
      return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }
  };
});
