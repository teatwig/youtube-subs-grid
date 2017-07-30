var YTG = YTG || {};

YTG.grid = (function (YTG, grid) {

    grid.settings = {
        'acknowledgedVersion': 0,
        'bypassMarkWatchedAlert': false
    };

    grid.setup = function (isClassicGridMode) {
        grid.videoCount = grid.allVideos().length;

        YTG.grid.markYTVideos();
        YTG.grid.markVideos();

        grid.isClassicGridMode = isClassicGridMode;

        if (grid.isClassicGridMode)
        {
            $('.ytg-gridable').addClass('ytg-classic-mode');
            grid.classicModeCleanup();
        }

        // Append our show/hide toggle
        grid.buildHistoryControls();

        YTG.grid.showAllLoadedVideos();

        YTG.grid.watchForGridChanges();
    };

    grid.isGrid = function()
    {
        return $('body').hasClass('ytg-gridable');
    };

    grid.updateWatchedVideos = function()
    {
        if (YTG.grid.isGrid()) {

            YTG.history.populateHistory(function () {
                YTG.grid.markVideos();
            });
        }
    };

    grid.allVideos = function(excludeWatched)
    {
        var videos = $('ytd-grid-video-renderer');
        if (excludeWatched)
        {
            videos = videos.not('.watched, .ytg-watched');
        }

        return videos;
    };

    // "What the hell" I hear you thinking, "why do you need this?"
    // Youtube autoloads a set of videos as you scroll.
    // There's no event I can find that YT fires for the loading of videos,
    // and short of intercepting all AJAX calls
    // (which I didn't seem to work anyway) this seemed
    // the best way with out resorting to constantly running loops.
    grid.watchForGridChanges = function()
    {
        // TODO observer is currently always called when you look at video previews #mouseover-overlay
        // select the target node
        var target = document.querySelector('ytd-section-list-renderer');

        // create an observer instance
        var observer = new MutationObserver(function(mutations) {
            //if (grid.allVideos().length > grid.videoCount) {
                grid.videoCount = grid.allVideos().length;

                YTG.grid.markVideos();

                YTG.grid.showAllLoadedVideos();

                // Are we in Classic mode? Fire cleanup for that too.
                if (YTG.grid.isClassicGridMode)
                {
                    YTG.grid.classicModeCleanup();
                }
            //}
        });

        // configuration of the observer:
        var config = { childList: true, subtree: true };

        // pass in the target node, as well as the observer options
        observer.observe(target, config);
    };

    grid.showAllLoadedVideos = function()
    {
        // Really YT? YT added this code to only show 10 videos per day. This shows ALL videos
        // per day because why on earth would I subscribe to a channel I don't want to see videos from?!
        $('.yt-uix-expander').removeClass('yt-uix-expander-collapsed');
        $('.yt-uix-expander-head').remove();
    };

    grid.classicModeCleanup = function()
    {
        $('.shelf-content').first().html($('.yt-shelf-grid-item').detach());

        $('h2.shelf-title-cell').remove();
        $('ol.section-list > li:not(:first-child)').remove();
    };

    grid.markAllVisibleVideos = function () {

        if (YTG.grid.settings.bypassMarkWatchedAlert || window.confirm('Are you sure you want to mark all videos as watched?')) {
            var videoArray = [];
            var excludeWatched = true;
            grid.allVideos(excludeWatched).each(function (idx, video) {
                var videoId = $(video).find('.ytg-mark-watched').attr('data-video-ids');

                videoArray.push(videoId);
            });

            YTG.history.massAddToHistory(videoArray);
        }
    };

    // Get all videos marked as watched on the
    // YT side of things, remove them from our
    // internal history
    grid.markYTVideos = function () {
        var videos = [];
        YTG.grid.allVideos().each(function (idx, elm) {
            if ($(elm).find('ytd-thumbnail-overlay-playback-status-renderer').length) {
                var videoId = $(elm).find('a').first().attr('href').substring(9, 20);
                videos.push(videoId);
            }
        });

        YTG.history.massRemoveFromHistory($.unique(videos));
    };

    grid.markVideos = function () {
        grid.allVideos().each(function (idx, video) {
            // if item completely loaded, youtube doesn't load #overlay children directly...
            if ($(video).find('ytd-thumbnail-overlay-toggle-button-renderer').length) {
                grid.cleanVideo(video);
                grid.markVideo(video);
            }
        });
    };

    grid.markVideo = function (videoElm) {
        videoElm = $(videoElm);
        var videoId = videoElm.find('a').first().attr('href').substring(9, 20);

        var videoLinkElm = videoElm.find('#overlays');

        // Can't unmark these ones.
        if (videoElm.find(':not(.ytg-watched) ytd-thumbnail-overlay-playback-status-renderer').length > 0) {
            videoElm.addClass('watched');
            videoElm.find('.ytg-mark-watched').attr('data-tooltip-text', 'Cannot changed watched status');
        }
        else if (!videoElm.hasClass('ytg-watched') && YTG.history.videoIsInHistory(videoId)) {
            videoElm.addClass('ytg-watched');
            videoLinkElm.prepend('<div class="watched-badge">WATCHED</div>');
            videoElm.find('.ytg-mark-watched').attr('aria-label', 'Mark as unwatched');
        }
        else if (videoElm.hasClass('ytg-watched') && !YTG.history.videoIsInHistory(videoId)) {
            videoElm.removeClass('ytg-watched');
            videoElm.find('.watched-badge').remove();
            videoElm.find('.ytg-mark-watched').attr('aria-label', 'Mark as watched');
        }


        if (videoElm.hasClass('ytg-watched') || videoElm.hasClass('watched') || videoElm.find('ytd-thumbnail-overlay-playback-status-renderer').length) {
            videoElm.addClass('ytg-contains-watched');
        }
        else {
            videoElm.removeClass('ytg-contains-watched');
        }
    };

    grid.cleanVideo = function (videoElm) {
        if (!$(videoElm).hasClass('ytg-cleaned')) {
            grid.addMarkWatchedBtn(videoElm);

            // Fix the thumbnail if its broken.
            $('.yt-thumb-clip img[src*="pixel"]').each(function (idx, elm) {
                $(this).attr('src', $(this).attr('data-thumb'));
            });

            $(videoElm).addClass('ytg-cleaned');
        }
    };

    grid.addMarkWatchedBtn = function (videoElm) {
        // Set up the mark as watched button.
        var watchLater = $(videoElm).find('ytd-thumbnail-overlay-toggle-button-renderer');
        var button = watchLater.clone();
        button.removeClass('addto-watch-later-button addto-button');
        button.addClass('ytg-mark-watched');
        button.attr('data-tooltip-text', 'Mark as watched');
        $(watchLater).parent().append(button);
    };

    grid.setHideVideos = function (hideVideos) {
        grid.hideVideos = hideVideos || false;
    };

    grid.toggleVideos = function () {
        if ($(this).hasClass('yt-uix-button-toggled')) {
            return false;
        }

        grid.hideVideos = !grid.hideVideos;
        grid.setViewToggle();

        YTG.platform.setStorageItem({ hideVideos: grid.hideVideos });
    };

    grid.setViewToggle = function () {
        $('#hideVideos,#showVideos').removeClass('yt-uix-button-toggled');

        if (grid.hideVideos) {
            $('#hideVideos').addClass('yt-uix-button-toggled');
            $('ytd-app').addClass('ytg-hide-watched-videos');
        }
        else {
            $('#showVideos').addClass('yt-uix-button-toggled');
            $('ytd-app').removeClass('ytg-hide-watched-videos');
        }
    };

    // Is a subs page, a collection page,
    // watch history or watch later page
    // and not an activity page.
    grid.isSubsSection = function (url) {
        var gridablePages = ['/feed/subscriptions', '/feed/SC'];

        return gridablePages.some(function (gridCheck) {
            if (url.indexOf(gridCheck) >= 0) {
                return true;
            }
        });
    };

    grid.isGridable = function (url) {

        if (grid.isSubsSection(url)) {
            return grid.allVideos().length > 0;
        }

        return false;
    };

    grid.buildHistoryControls = function() {
        var headerContainer = $('.grid-subheader').first();

        YTG.platform.getControlMarkup(function(markup)
        {
            headerContainer.prepend(markup);

            headerContainer.on('click', '.view-toggle-button', YTG.grid.toggleVideos);
            headerContainer.on('click', '#markAllVideos', YTG.grid.markAllVisibleVideos);

            YTG.grid.setViewToggle();

            // Move the grid selector in to our markup for better style control.
            $('.ytg-grid-selector').append($('#menu.ytd-shelf-renderer').first().detach());

            YTG.platform.getStorageItem(grid.settings, function(data) {

                // Override our defaults.
                grid.settings = data;

                if (data.acknowledgedVersion < YTG.internalFeatureVersion)
                {
                    $('.ytg-subs-grid-settings-button').addClass('ytg-has-updates');
                }

                Object.keys(data).forEach(function(key)
                {
                    $('.ytg-settings input[name="'+key+'"]').prop('checked', data[key]);
                });


            });
        });
    };

    grid.settingsClickedHandler = function()
    {
        $('.ytg-settings').slideToggle({
            complete: function () {
                if ($('.ytg-subs-grid-settings-button').hasClass('ytg-has-updates'))
                {
                    $('.ytg-subs-grid-settings-button').removeClass('ytg-has-updates');
                    YTG.platform.setStorageItem({ acknowledgedVersion: YTG.internalFeatureVersion });
                }
            }
        });
    };

    grid.settingCheckboxClickedHandler = function(e)
    {
        var settingElement = $(this);
        var name = settingElement.attr('name');
        var val = settingElement.prop('checked'); // Ignore the value just get the opposite of its checked status.
        var setting = {};

        settingElement.prop('disabled', true);

        setting[name] = val;
        YTG.platform.setStorageItem(setting, function()
        {
            grid.settings[name] = val;
            settingElement.prop('checked', val);

            settingElement.prop('disabled', false);
        });
    };

    return grid;
}(YTG, YTG.grid || {}));