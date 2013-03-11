/**
 * jQuery inlineComplete Plugin
 * Examples and documentation at: http://patrickburke.de/index.php/jquery-inlinecomplete
 * Version: 0.12 ALPHA
 * Requires: jQuery v1.5
 *
 * Licensed under the MIT license:
 *
 * Copyright (c) 2011 Patrick Burke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function ($) {
    /**
     * Guts of the inlineComplete plugin.
     */
    var _inlineComplete = {
        _defaultOptions:{
            terms: [],
            matchCase:false,
            submitOnReturn:false,
            startChar: 'p',
            startCharCi: true
        },

        _searchTerm: function(userInput, terms) {
            for (var i in terms) {
                if (terms[i].substr(0, userInput.length) == userInput) {
                    return terms[i];
                }
            }

            return null;
        },

        _getCurrentWord: function(text, cursorPosition) {
            var start = text.substr(0, cursorPosition).lastIndexOf(' ') + 1;

            return text.substr(start, cursorPosition);
        },

        /**
         * Performs the actual inline complete. Usually the body of the event callback.
         * @param {DOMElement} inputElement The element which should have the inline complete.
         * @param {Object} event
         * @param {Object} options
         */
        _performComplete:function (inputElement, event, options) {
            var $inputElement = $(inputElement);

            // Backspace/Delete deletes current selection created by prior auto-complete action, if any.
            // Backspace or delete or no data
            if (event.which == 8 || event.which == 46 || !options.terms || options.terms.length == 0) {
                return true;
            } else if (event.which == 16) {
                return this;
            }

            // Get the letter the user pressed and trim the any whitespace
            var letter = String.fromCharCode(event.which).replace(/^\s\s*/, '').replace(/\s\s*$/, '');

            if (letter == '')
                return true;

            // String.fromCharCode returns uppercase...
            if (!event.shiftKey)
                letter = letter.toLowerCase();

            var termList = options.terms,
                curPos = $inputElement.__cursorPosition(),
                userInput = this._getCurrentWord($inputElement.val()),
                inputValue = $inputElement.val(),
                returnValue = true;

            if (!options.matchCase) {
                userInput = userInput.toLowerCase();
            }

            if (userInput != '') {
                if (event.type == 'keydown') {
                    // Move selection

                    var selection = $inputElement.__getSelection();

                    if (letter == selection.substr(0, 1)) {
                        $inputElement.__moveSelectionStart(1);

                        event.preventDefault();

                        returnValue = false;
                    }
                } else if(event.type == 'keyup') {
                    // Make selection
                    var foundTerm = this._searchTerm(userInput, options.terms);

                    if (foundTerm !== null) {
                        var beforeCursor = inputValue.substr(0, curPos);
                        var afterCursor = inputValue.substr(curPos, inputValue.length);

                        var curPosInWord = userInput.length;

                        $inputElement.val(beforeCursor + foundTerm.substr(curPosInWord, foundTerm.length) + afterCursor);

                        $inputElement.__select(curPos, foundTerm.substr(curPosInWord, foundTerm.length).length + curPos);
                    }
                }
            }

            return returnValue;
        }
    };

    /**
     * Register the select plugin in the inlineComplete settings. Selects a range in the selected text fields.
     * @param {Number} startPos
     * @param {Number} endPos
     */
    $.fn.__select = function (startPos, endPos) {
        if (typeof startPos == 'number' && typeof endPos == 'number') {
            this.each(function () {
                var start;
                if (typeof this.selectionStart !== "undefined") {
                    this.selectionStart = startPos;
                    this.selectionEnd = endPos;
                }
                else {
                    var range = document.selection.createRange();
                    this.select();
                    var range2 = document.selection.createRange();

                    range2.setEndPoint("EndToStart", range);
                    start = range2.text.length;

                    this.select();
                    range = document.selection.createRange();
                    range.moveStart("character", start);
                    range.select();
                }
            });
        }

        return this;
    };

    $.fn.__getSelection = function() {
        var el = this.get(0);

        if (typeof el.selectionStart != 'undefined') {
            return this.val().substr(el.selectionStart, el.selectionEnd);
        } else {
            var range = document.selection.createRange();

            return range.text;
        }
    };

    $.fn.__moveSelectionStart = function(amount) {
        if (typeof amount == 'number') {
            this.each(function() {
                if (typeof this.selectionStart !== 'undefined') {
                    this.selectionStart += amount;
                } else { // ie
                    var range = document.selection.createRange();
                    range.moveStart("character", amount);
                    range.select();
                }
            });
        }
    };

    $.fn.__cursorPosition = function() {
        if (typeof this.get(0).selectionStart !== 'undefined') {
            return this.get(0).selectionStart;
        } else { // ie
            var range = document.selection.createRange();
            range.moveStart("character", amount);
            range.select();
        }
    };

    /**
     * Register inlineComplete plugin. This enables you to use $('input').inlineComplete();
     *
     * In the options object you have to at least include a list of terms you want have completion for.
     * The index for that list must be "terms". You may also pass a URL. inlineComplete will then
     * get the list of terms from that source. Again, the response must contain the "terms" index
     * containing the terms.
     * @param {Object} options
     */
    $.fn.inlineComplete = function (options) {
        options = $.extend({}, _inlineComplete._defaultOptions, options);

        if (!options.terms) {
            if (this.data('terms')) {
                if (this.data('terms').indexOf('list') === 0) {
                    options.terms = this.data('terms').replace(/^list:/i, '').split('|');
                } else if (this.data('terms').indexOf('url') === 0) {
                    options.terms = this.data('terms').replace(/^url:/i, '');
                }
            }
        }

        // Still no options? Get the hell out of here!
        if (!options.terms) {
            return this;
        }

        // TODO wouldn't it be great if you could pass a jqXHR object which
        // is handled by inlineComplete?
        if (typeof options.terms == 'string') {
            var $that = this;
            $.getJSON(options.terms, function (response) {
                if (!response.terms && window.console && window.console.error)
                    console.error("Invalid response for inline complete terms!");

                options.terms = response.terms;

                $that.inlineComplete(options);
            });
        } else {
            // TODO Why can't I use jQuery.live() here?!
            this.filter('input[type=text], textarea').bind('keyup keydown', function (e) {
                return _inlineComplete._performComplete(this, e, options);
            });
        }

        return this;
    }
})(jQuery);