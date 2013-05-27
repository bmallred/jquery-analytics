// The MIT License (MIT)
//
// Copyright (c) <year> <copyright holders>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

String.prototype.startsWith = function (search) {
    return this.indexOf(search) == 0;
}

String.prototype.endsWith = function (search) {
    return original.lastIndexOf(search) == original.length - search.length;
};

(function ($) {
    var uniqueId = 0;

    $.fn.analyticsUniqueId = function () {
        if (this.length == 0) {
            return;
        }

        return this.each(function () {
            if (!$(this).attr("id")) {
                $(this).attr("id", "analytics-id-" + ++uniqueId);
            }
        });
    };
})(jQuery);

(function ($) {
    var settings = {
        attributes: [],
        assignTo: ["a", "input[type='submit']"],
        url: null,
        client: null,
        live: false
    };

    function walkTree(element) {
        var tree = [];
        var tagName = $(element).prop("tagName");
        
        if (tagName != undefined) {
            var parent = $(element).parent();
            if (parent != undefined) {
                $.each(walkTree($(element).parent()), function (i, node) {
                    tree.push(node);
                });
            }
            
            var tagId = $(element).analyticsUniqueId().attr("id");
            tree.push(tagName + '[id="' + tagId + '"]');
        }
        
        return tree;
    }

    function identifyPath(node) {
        // Assign identification to all relevant elements.
        walkTree(node);
    }

    function initiateTrace(e) {
        $this = $(this);

        if (settings.url && !$this.is(".analytics-passthrough")) {
            // We prevent the default action to allow the background call to succeed.
            e.preventDefault();

            var data = {
                id: walkTree($this).join('.')
            };

            // Attach the client identifier if found.
            if (settings.client) {
                data["client"] = settings.client
            }

            // Assign any "data-analytics-" attributes.
            var dataAttributes = $this.data();
            for (var attribute in dataAttributes) {
                if (attribute.startsWith("analytics")) {
                    var cleanName = attribute.replace(/analytics/g, '').toLowerCase();
                    data[cleanName] = dataAttributes[attribute];
                }
            }

            // Assign the custom attributes requested to be collected.
            $.each($(settings.attributes), function (i, attribute) {
                data[attribute] = $this.attr(attribute);
            });

            $.ajax({
                type: "POST",
                url: settings.url,
                contentType: "application/x-www-form-urlencoded",
                data: data
            })
            .always(function () {
                $this.addClass("analytics-passthrough").click();
            });
        }
    }
    
    $.fn.analytics = function (options) {
        if ($(this).length == 0) {
            return;
        }

        // Configure the default settings.
        settings = $.extend({}, settings, options);

        return this.each(function () {
            var selector = settings.assignTo.join(",");
            $this = $(this);
        
            $this.find(selector)
            .each(function () {
                identifyPath($(this));
                $(this).click(initiateTrace);
            });
        })
        .on("DOMNodeInserted", function (e) {
            $target = $(e.target);
            identifyPath($target);
            $target.click(initiateTrace);
        });
    };
})(jQuery);