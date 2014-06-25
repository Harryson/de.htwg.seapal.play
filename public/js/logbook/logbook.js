var map;

//HTML templates - Handlebars lib
var tripTemplate;
var waypointTemplate;
var ajaxLoaderTemplate;
var loadMoreEntriesTemplate;
var entryDetailsTemplate;
var timelineTripTemplate;
var timelineWaypointTemplate;
var timelineTripHeaderTemplate;

var dateFormatShort = "YYYY-MM-DD";
var timeFormat = "h:mm:ss a";

var isLoadingWaypoints = false;
var data_loaded = false;
var scrollToWaypointTimeout;

var boatId;

// set handler for HTTP-Forbidden errors:
logbook.onForbidden = function () {
    window.location.href = '@de.htwg.seapal.web.controllers.routes.Application.forbiddenContent()';
}

function initialiseLogbook(initialTripId, boatId){
    this.boatId = boatId;
    var dateFormatShort = "YYYY-MM-DD";
    var timeFormatShort = "mm:ss:zzz";

    // preloaded Images
    var expandImage = new Image();
    var contractImage = new Image();
    expandImage.src = '@routes.Assets.at("images/logbook/expand-icon.png")';
    contractImage.src = '@routes.Assets.at("images/logbook/contract-icon.png")';

    // compile the HTML templates with Handlebars lib
    tripTemplate = Handlebars.compile($('#tripTemplate').html());
    waypointTemplate = Handlebars.compile($('#waypointTemplate').html());
    ajaxLoaderTemplate = Handlebars.compile($('#ajaxLoaderTemplate').html());
    loadMoreEntriesTemplate = Handlebars.compile($('#loadMoreEntriesTemplate').html());
    entryDetailsTemplate = Handlebars.compile($('#entryDetailsTemplate').html());
    timelineTripTemplate = Handlebars.compile($('#timelineTripTemplate').html());
    timelineWaypointTemplate = Handlebars.compile($('#timelineWaypointTemplate').html());
    timelineTripHeaderTemplate = Handlebars.compile($('#timelineTripHeaderTemplate' ).html());

    // load the initial trip
    changeTripTo(initialTripId);

    // load the timeline
    logbook.getAllTripsOfBoat(boatId, onReceivedAllTrips);
    //logbook.getAllWaypointsOfTrip(initialTripId, onReceivedAllWaypointsByTrip);

    // click handlers for loading previous/next trip
    $('.NextPrevTripButton').click(function () { changeTripTo($(this).attr('data-trip')) });

    // toggle sections of the details panel
    $('.accordion .head').click(function () {
        // change expander image
        var headId = $(this).attr('id');
        var changeImage = document.getElementById(headId.substr(0, headId.lastIndexOf('_')) + '_img');

        if (changeImage.src == expandImage.src) {
            changeImage.src = contractImage.src;
            if(headId != 'details_map_head') {
                $(this).next().toggle("slow", function(){
                    initialiseCharts ( ) ;
                    var tripHeader = $('#trip_header_'+initialTripId);
                    initialiseDistributionCharts(tripHeader);
                });
            }
        } else {
            changeImage.src = expandImage.src;
            $(this).next().toggle("slow");
        }
        return true;
    });

    //add margin to entries column. Otherwise it's not posible to scroll to the last entry
    $('#entries_col').css('margin-bottom', $.waypoints('viewportHeight'));

    // add handlers for clicks on trips & waypoints in the timeline
    $('#timeline').on('click', 'div.timeline-panel.expandable', function () {     // click on trip header in timeline
        var tripId = $(this).attr("id");
        tripId = tripId.replace('timeline-trip_', '');

        // check if this is the active trip
        var tripContainer = $('#trip_' + tripId);
        if (tripContainer.length != 0) {
            $('#timeline-trip_container_' + tripId).toggle("slow");
            return true;
        } else {
            // this trip is currently not loaded -> get it
            $('#entries').html(ajaxLoaderTemplate({ loaderId: 'tripLoader' }));
            logbook.getTripData(tripId, onReceivedTrip);
        }

    });

    $('#timeline').on('click', 'div.timeline-panel.clickable', function () {    // click on waypoint item in timeline
        var waypointId = $(this).attr("id");
        waypointId = waypointId.replace ( 'timeline-', '' );
        var entry = $("#" + waypointId);
        scrollToWaypoint(entry);
        return true;
    });

    $('#details').dragscrollable({ dragSelector: '.dragscrollarea', acceptPropagatedEvent: true });
    $('#timeline').dragscrollable();

    //hotfix: hrefs didn't work anymore (click returns false anywere?!)
    $('.navbar .nav a').click(function (event) {
        var url = $(this).attr('href');
        //console.log(url);
        window.location = url;
        return true;
    });

    map = new google.maps.Map(document.getElementById('map_canvas'));

    // click handlers for entry filter buttons
    $('#chkOnlyWithImage, #chkOnlyWithNote').click(function () {
        $(this).toggleClass('active');
        applyEntryFilters();
    });
    $('#timeOffsetToggler').click(function () {
        var currentValue = parseInt($(this).html());
        var newValue = 0;
        if (currentValue == 0)
            newValue = 5;
        else if (currentValue == 5)
            newValue = 15;
        else if (currentValue == 15)
            newValue = 30;
        else if (currentValue == 30)
            newValue = 60;
        else
            newValue = 0;

        $(this).html(newValue);
        applyEntryFilters();
    });

    // click handlers for panel toggle buttons in menubar
    $('#timelineToggler').click(function () { $('#timeline_col').toggleClass('forceOpen'); $('#details_col').removeClass('forceOpen'); });
    $('#detailsToggler').click(function () { $('#details_col').toggleClass('forceOpen'); $('#timeline_col').removeClass('forceOpen'); });
    // hide side panels if mouse leaves them
    $('#entries_col').mouseenter(function () { $('#details_col, #timeline_col').removeClass('forceOpen'); })
    $('#entries_col').click(function () { $('#details_col, #timeline_col').removeClass('forceOpen'); })
};

// changes the currently displayed trip to another one
function changeTripTo(tripId) {
    if (tripId && tripId.length > 0) {
        $('#entries').html(ajaxLoaderTemplate({ loaderId: 'tripLoader' }));
        $('#timeline').append(ajaxLoaderTemplate({ loaderId: 'tripLoaderTimeline' }));
        $('#details_map').append(ajaxLoaderTemplate({ loaderId: 'tripLoaderMap' }));
        $('#details_trip_weather_stats_content').hide();

        $('.NextPrevTripButton').hide();
        $('#entries').html(ajaxLoaderTemplate({ loaderId: 'tripLoader' }));
        logbook.getTripData(tripId, onReceivedTrip);
    }
}

// Adds the function 'callback' as a handler when the users scrolls to the 'item'.
function initWaypoint(item, callback, last_entry_node) {
    var offset_up = 10;
    var offset_down = parseInt($('#menu_bar').css("height")) + parseInt($(last_entry_node).css('height')) ;

    if($(last_entry_node ).hasClass("tripHeader")){
        offset_down/=2;
    }

    item.waypoint(function (direction) {
        if (direction == "down") {
            callback(item);
        }
    }, { offset: offset_down });

    item.waypoint(function (direction) {
        if (direction == "up") {
            callback(item);
        }
    }, { offset: offset_up });
}

// callback of getTripData()
function onReceivedTrip(tripId, tripData) {
    // prepare formatted datetime strings (required in handlebars templates)
    tripData.formattedStartDate = moment(new Date(tripData.startDate)).format(dateFormatShort + " " + timeFormat);
    tripData.formattedEndDate = moment(new Date(tripData.endDate)).format(dateFormatShort + " " + timeFormat);

    // hide the loading animations
    $('#tripLoader').remove();
    $('#tripLoaderTimeline').remove();
    $('#tripLoaderMap').remove();

    // create the container for this trip
    $('#entries').append(tripTemplate(tripData));

    var trip_header = $('#trip_header_' + tripId);
    initWaypoint(trip_header, onScrolledToTripHeader, trip_header); // add scrolled-to handler
    trip_header.data("tripData", tripData);  // store the DB object in this DOM element

    // lookup previous and next trip
    // add handler for click on a waypoint marker in the map (scroll to waypoint position in entries view)
    setMarkerClickFunction(clicked_on_marker);
    logbook.getTripsOfBoat(boatId, tripData.startDate, 1, 1, 'true', onReceivedPreviousTrip);  // previous
    logbook.getTripsOfBoat(boatId, tripData.startDate, 1, 1, 'false', onReceivedNextTrip);  // next

    // get the waypoints of this trip
    loadMoreEntries(tripId, 0);  // 0 = all waypoints
}

// callbacks from getTripsOfBoat, receives a subset of the properties of the previous/next trip
// enables or disables the "Load previous Trip" button depending on whether the currently loaded trip has a predecessor or not.
function onReceivedPreviousTrip(trips) {
    if (trips.length > 0) {
        $('#prevTripName').html(trips[0].name);
        $('#btnLoadPreviousTrip').attr('data-trip', trips[0]._id).css('display', 'block');
        var scrollOffset = $('.tripHeader').offset().top - $('#entries_col').css("margin-top").replace("px", "");
        //alert(scrollOffset);
        $('html,body').prop('scrollTop', scrollOffset);
        //$('.tripHeader')[0].scrollIntoView(true);
    } else {
        $('#btnLoadPreviousTrip').attr('data-trip', '').hide();
    }
}

// callbacks from getTripsOfBoat, enables or disables the "Load next Trip" button
// depending on whether the currently loaded trip has a successor or not.
function onReceivedNextTrip(trips) {
    if (trips.length > 0) {
        $('#nextTripName').html(trips[0].name);
        $('#btnLoadNextTrip').attr('data-trip', trips[0]._id).css('display', 'block');
    } else {
        $('#btnLoadNextTrip').attr('data-trip', '').hide();
    }
}

// callback of logbook.getAllTripsOfBoat
// Populates the inital timeline
function onReceivedAllTrips(trips) {
    var timelineContainer = $('.timeline_header');
    $.each(trips, function (index, tripData) {
        tripData.startDate = moment(new Date(tripData.startDate)).format(dateFormatShort);
        timelineContainer.append(timelineTripTemplate(tripData));
    });
}

// callback of getTripWaypoints()
function onReceivedWaypoints(tripId, waypoints) {
    var tripContainer = $('#trip_' + tripId);
    var timelineTripContainer = $('#timeline-trip_container_' + tripId);
    var trip_header = $('#trip_header_' + tripId);

    var tripData = trip_header.data("tripData");
    var speed_title = 'Speed - ' + tripData.name;
    var speed_description = tripData.from + " to " + tripData.to
    var waypoint_names = [];
    var waypoint_ids = [];
    var speed_data_y = [];
    var index_data_x = [];
    var air_pressure_data_y = [];
    var cloudage_data_y = [];
    var temperature_data_y = [];

    //N, NNO, NO, .... -->  16 keys
    var wind_data_map = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0};
    var wave_data_map = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0, 12:0, 13:0, 14:0, 15:0};
    var degree_step = 22.5; // 360:16

    var minTemp = 1000;
    var maxTemp = -1000;

    var last_entry_node = trip_header;

    // hide ajax loader in this trip container
    $('#entryLoader' + tripId).remove();

    tripData.formattedDate = moment(new Date(tripData.startDate)).format(dateFormatShort);
    timelineTripContainer.append(timelineTripHeaderTemplate(tripData));

    var map_waypoints = [];

    //console.log(waypoints);
    // iterate all received waypoints and append the template to the container of the trip & the timelime
    $.each(waypoints, function (index, waypointData) {
        // unix timestamp -> formatted time
        waypointData.formattedDate = moment(new Date(waypointData.date)).format(dateFormatShort);
        waypointData.formattedTime = moment(new Date(waypointData.date)).format(timeFormat);
        minTemp = (waypointData.tempCelsius < minTemp) ? waypointData.tempCelsius : minTemp;
        maxTemp = (waypointData.tempCelsius > maxTemp) ? waypointData.tempCelsius : maxTemp;
        // append to trip in timeline panel
        timelineTripContainer.append(timelineWaypointTemplate(waypointData));

        // append to trip in entries panel
        tripContainer.append(waypointTemplate(waypointData));
        var entryNode = $('#waypoint_' + waypointData._id);
        entryNode.data('waypointData', waypointData);
        initWaypoint(entryNode, onScrolledToWaypoint, last_entry_node);

        last_entry_node = entryNode;
        index_data_x.push(index + 1);
        speed_data_y.push(parseFloat(waypointData.sog));
        air_pressure_data_y.push(parseFloat(waypointData.atmosPressure));
        cloudage_data_y.push(parseFloat(waypointData.cloudage));
        temperature_data_y.push(parseFloat(waypointData.tempCelsius));
        waypoint_names.push(waypointData.name);
        waypoint_ids.push(waypointData._id);

        compassOrderdInsert(wind_data_map, degree_step, waypointData.windDirection, waypointData.windSpeedBeaufort);
        compassOrderdInsert(wave_data_map, degree_step, waypointData.windDirection, waypointData.wavesHeight);

        map_waypoints[index] = new google.maps.LatLng(waypointData.lat, waypointData.lng);
    });

    initialize_waypoints(map_waypoints);

    // click handler for the waypoints
    $('.logbookEntry').click(function (e) {
        if ($(e.target).is('img')) {
            e.preventDefault();
            return;
        }
        scrollToWaypoint($(this));
    });

    // set trip weather stats if available
    if (minTemp != 1000) {
        $('#tripMinTemp').html(Math.round(minTemp));
        $('#tripMaxTemp').html(Math.round(maxTemp));
        $('#details_trip_weather_stats_content').show();
    }

    var wind_data = [];
    var wave_data = [];
    mapToArray(wind_data_map, wind_data);
    mapToArray(wave_data_map, wave_data);

    // charts are not initialised here because the div they're going to be rendered in needs to be visible. (if user reloads page and tripHeader is not active)
    trip_header.data('wind_data', wind_data);
    trip_header.data('wave_data', wave_data);
    trip_header.data('index_data_x', index_data_x);
    trip_header.data('speed_data_y', speed_data_y);
    trip_header.data('waypoint_names', waypoint_names);
    trip_header.data('waypoint_ids', waypoint_ids);
    trip_header.data('speed_title', speed_title);
    trip_header.data('speed_description', speed_description);
    trip_header.data('air_pressure_data_y', air_pressure_data_y);
    trip_header.data('cloudage_data_y', cloudage_data_y);
    trip_header.data('temperature_data_y', temperature_data_y);

    if(trip_header.isOnScreen()) {
        initialiseDistributionCharts ( trip_header ) ;
    }

    // refresh waypoint handlers to new positions of elements
    window.setTimeout(function () { $.waypoints('refresh'); }, 200);

    isLoadingWaypoints = false;
}

// insert values in a map object with 16 keys, each representing compass directions (22.5 degrees).
function compassOrderdInsert(map, degree_step, degree, value){
    var key = Math.floor(degree/degree_step);

    if(!(key in map) || map[key] < value){
        map[ key ] = value ;
    }
}

// pushes all values of a map into an array
function mapToArray(map, array){
    for (var key in map) {
        array.push(map[key]);
    }
}

// loads or appends waypoint entries to a trip
function loadMoreEntries(tripId, count) {
    if (isLoadingWaypoints) {
        return;
    }

    isLoadingWaypoints = true;
    var tripContainer = $('#trip_' + tripId);
    var loadedEntriesCount = tripContainer.children('.logbookEntry').length;

    // remove "load more" button
    tripContainer.children('.loadMoreSection').remove();
    // show loader for entries:
    tripContainer.append(ajaxLoaderTemplate({ loaderId: 'entryLoader' + tripId }));

    // get the next waypoints of this trip
    logbook.getTripWaypoints(tripId, loadedEntriesCount, count, onReceivedWaypoints);
}

// callback for trip container when scrolled to
function onScrolledToWaypoint(node) {
    $('.logbookEntry').removeClass("active");
    node.addClass("active");

    // change details
    var waypointData = node.data('waypointData');
    if (typeof (waypointData) != "undefined") {
        var coordHelper = new coordinateHelpers();

        waypointData.latRounded = coordHelper.getLatAsString(waypointData.lat);
        waypointData.lngRounded = coordHelper.getLngAsString(waypointData.lng);
    }
    $('#details_text').html(entryDetailsTemplate(waypointData));


    if (typeof (scrollToWaypointTimeout) != undefined) {
        clearTimeout(scrollToWaypointTimeout);
    }

    scrollToWaypointTimeout = setTimeout(function () {
        //console.log("onScrolledToWaypoint timeout called")
        hideDistributionCharts();
        showCharts();
        initialiseCharts();

        // mark waypoint in Map
        if (typeof (map) != "undefined" && typeof (waypointData) != "undefined") {
            highlight_waypoint(new google.maps.LatLng(waypointData.lat, waypointData.lng));
        }

        if (typeof (window.sogChart) != "undefined") {
            var point = window.sogChart.series[0].points[0];
            var newVal = waypointData.sog.substr(0, waypointData.sog.lastIndexOf(' '));
            point.update(parseFloat(newVal));
            window.sogChart.redraw();
        }

        if (typeof (window.cogChart) != "undefined") {
            //var pointH = window.cogChart.series[0].points[0];
            var pointB = window.cogChart.series[0].points[0];
            var newValH = parseFloat(waypointData.cog.substr(0, waypointData.sog.lastIndexOf(' ')));
            var newValB = newValH - 180;
            if (newValB < 0) {
                newValB = 360 + newValB;
            }
            //pointH.update(newValH);
            pointB.update(newValB);
            window.cogChart.redraw();
        }

        if (typeof (window.windCompassChart) != "undefined") {

            // change point
            if (typeof (waypointData.windDirection) != "undefined") {
                var windDirPoint = window.windCompassChart.series[0].points[0];
                var newDir = waypointData.windDirection - 180;
                if (newDir < 0) {
                    newDir = 360 + newVal;
                }
                windDirPoint.update(newDir);
            }

            // change yAxis title
            if (typeof (waypointData.windSpeedBeaufort) != "undefined") {
                $('#windCompassTitle').html(waypointData.windSpeedBeaufort.toFixed(2));
            } else {
                $('#windCompassTitle').html('');
            }

            window.windCompassChart.redraw();
        }

        if (typeof (window.waveCompassChart) != "undefined") {
            // change point
            if (typeof (waypointData.wavesDirection) != "undefined") {
                var waveDirPoint = window.waveCompassChart.series[0].points[0];
                var newWaveDir = waypointData.wavesDirection - 180;
                if (newWaveDir < 0) {
                    newWaveDir = 360 + newWaveDir;
                }
                waveDirPoint.update(newWaveDir);
            }

            // change yAxis title
            if (typeof (waypointData.waveHeight) != "undefined") {
                $('#waveCompassTitle').html(waypointData.waveHeight.toFixed(2));
            } else {
                $('#waveCompassTitle').html('');
            }
            window.waveCompassChart.redraw();
        }

        if (typeof (window.airPressureChart) != "undefined") {
            // change point
            var airPressPoint = window.airPressureChart.series[0].points[0];
            var newPressure = parseFloat(waypointData.atmosPressure);
            airPressPoint.update(newPressure);

            window.airPressureChart.redraw();
        }

        if (typeof (window.cloudsChart) != "undefined") {
            // change point
            var cloudPoint = window.cloudsChart.series[0].points[0];
            var newCloud = parseFloat(waypointData.cloudage);
            cloudPoint.update(newCloud);

            window.cloudsChart.redraw();
        }

        if (typeof (window.temperatureChart) != "undefined") {
            // change point
            var tempPoint = window.temperatureChart.series[0].points[0];
            var newTemp = parseFloat(waypointData.tempCelsius);
            tempPoint.update(newTemp);

            window.temperatureChart.redraw();
        }


    }, 500);
}

function onScrolledToTripHeader(node) {
    if (typeof (scrollToWaypointTimeout) != undefined) {
        clearTimeout(scrollToWaypointTimeout);
    }
    $('.logbookEntry').removeClass("active");

    $('#details_text').html(entryDetailsTemplate());
    //zoom out map
    reset_map_zoom();

    showDistributionCharts();
    hideCharts();

    if(typeof node.data('index_data_x') != 'undefined') {
        initialiseDistributionCharts(node);
    }
}

function initialiseCharts(){
    //only call init once if there's no html content inside the matching div
    if( ($.trim($('#speedometer_sog' ).html()) == '' && ($('#details_info' ).css('display') == 'block') )){
        initSOGSpeedometer('speedometer_sog');
    }
    if($.trim($('#compass_cog' ).html()) == '' && ($('#details_info' ).css('display') == 'block') ){
        initCOGCompass('compass_cog');
    }
    if($.trim($('#wind_compass' ).html()) == '' && ($('#details_weather' ).css('display') == 'block') ){
        initWindCompassChart('wind_compass');
    }
    if($.trim($('#wave_compass').html()) == '' && ($('#details_weather' ).css('display') == 'block') ){
        initWaveCompassChart('wave_compass');
    }
    if($.trim($('#air_pressure' ).html()) == '' && ($('#details_weather' ).css('display') == 'block') ){
        initAirPressureChart('air_pressure');
    }
    if($.trim($('#clouds' ).html()) == '' && ($('#details_weather' ).css('display') == 'block') ){
        initCloudsChart('clouds');
    }
    if($.trim($('#temperature' ).html()) == '' && ($('#details_weather' ).css('display') == 'block') ){
        initTemperatureChart('temperature');
    }
}

/**
 * Inits the charts which show the overview charts of the whole trip.
 */
function initialiseDistributionCharts(tripData){
    // load speed table
    if ( $.trim ( $ ( '#details_charts_distribution' ).html ( ) ) == '' && ($('#details_info' ).css('display') == 'block') ) {
        initSpeedChart ( $ ( '#details_charts_distribution' ), tripData.data ( 'index_data_x' ), tripData.data ( 'speed_data_y' ), tripData.data ( 'waypoint_names' ), tripData.data ( 'waypoint_ids' ), tripData.data ( 'speed_title' ), tripData.data ( 'speed_description' ) ) ;
    }
    // load wind table
    if ( $.trim ( $ ( '#wind_distribution' ).html ( ) ) == '' && ($('#details_weather' ).css('display') == 'block') ) {
        initWindDirSpeedChart ( 'wind_distribution', tripData.data ( 'wind_data' )) ;
    }
    // load wind table
    if ( $.trim ( $ ( '#wave_distribution' ).html ( ) ) == '' && ($('#details_weather' ).css('display') == 'block') ) {
        initWaveDirHeightChart ( 'wave_distribution', tripData.data ( 'wave_data' ) ) ;
    }
    // load air pressure/clouding/temperature table
    if ( $.trim ( $ ( '#air_pressure_cloudage_temperature_distribution' ).html ( ) ) == '' && ($('#details_weather' ).css('display') == 'block') ) {
        initAirPressureCloudingTemperatureChart ( '#air_pressure_cloudage_temperature_distribution', tripData.data ( 'index_data_x' ), tripData.data ( 'air_pressure_data_y' ), tripData.data ( 'cloudage_data_y' ), tripData.data ( 'temperature_data_y' ), tripData.data ( 'waypoint_ids' ) ) ;
    }
}


/**
 * Shows or hides waypoints based on the current filter settings
 */
function applyEntryFilters() {
    var onlyImages = $('#chkOnlyWithImage').hasClass('active');
    var onlyNotes = $('#chkOnlyWithNote').hasClass('active');
    var minTimePeriod = parseInt($('#timeOffsetToggler').html()) * 60 * 1000;   // min to msec
    var lastTimestamp = -1;

    // iterate over all waypoints in entry view & timeline
    $('.logbookEntry').each(function (index, value) {
        var item = $(value);  // waypoint entry in entries view
        var waypointData = item.data('waypointData'); // DB object
        var timelineItem = $('#timeline-wp-container_' + waypointData._id);  // corresponding entry in timeline

        // skip item if not at least [minTimePeriod] minutes between this and the last item
        if (minTimePeriod > 0 && lastTimestamp > (parseInt(waypointData.date) - minTimePeriod)) {
            item.addClass('filtered');
            timelineItem.addClass('filtered');
            return;
        }
        lastTimestamp = parseInt(waypointData.date);

        if ((onlyImages && !$(item).hasClass('hasImage')) && (!onlyNotes || (onlyNotes && !$(item).hasClass('hasNote'))) ) {
            item.addClass('filtered');
            timelineItem.addClass('filtered');
        }else if ((onlyNotes && !$(item).hasClass('hasNote')) && (!onlyImages || (onlyImages && !$(item).hasClass('hasImage'))) ) {
            item.addClass('filtered');
            timelineItem.addClass('filtered');
        } else { // show item
            item.removeClass('filtered');
            timelineItem.removeClass('filtered');
        }

    });
    // refresh waypoint handlers to new positions of elements
    window.setTimeout(function () { $.waypoints('refresh'); }, 750);
}

// callback of waypoint.js (invoked when the user scrolls to a logbook entry or trip header)
function scrollToWaypoint(waypoint) {
    $('.logbookEntry').waypoint('disable');
    var offset = $(waypoint).offset().top - parseInt($('#menu_bar').css('height'));
    $('html, body').animate({
        scrollTop: offset
    }, {
        done: function () {
            if(waypoint.hasClass("TripHeader")){
                onScrolledToTripHeader(waypoint);
            }else if(waypoint.hasClass("logbookEntry")) {
                onScrolledToWaypoint ( waypoint ) ;
            }
            $('.logbookEntry').waypoint('enable');
        }
    }, 'slow');
}

// click handler for the markers on the map
function clicked_on_marker(marker) {
    var lat = marker.getPosition().lat();
    var lng = marker.getPosition().lng();
    var waypoint = getWaypointFromPosition(lat, lng);
    if (typeof (waypoint) != "undefind") {
        scrollToWaypoint(waypoint);
    }
}

function getWaypointFromPosition(lat, lng) {
    var waypoint;

    //hotfix: the longitude differs for some strange reasons... only after the 9th digit.
    //(object received with getTripData have different longitudes as objects received with getTripWaypoints?!)
    lng = lng.toFixed(9);
    $.each($(".logbookEntry"), function () {
        var waypointData = $(this).data().waypointData;
        var match = (waypointData.lat == lat) && (waypointData.lng.toFixed(9) == lng);
        //console.log("lat: "+waypointData.lat+" lng: "+waypointData.lng);
        //console.log(match);
        if (match) {
            waypoint = $(this);
            return false;
        }
    });
    return waypoint;
}

/**
 * This method hides the Distribution charts
 */
function hideDistributionCharts() {
    $('#details_charts_distribution').css("display", "none");
    $('#details_weather_charts_distribution').css("display", "none");
    $('#details_trip_weather_stats').css("display", "none");
}

/**
 * This method shows the Distribution charts
 */
function showDistributionCharts() {
    $('#details_charts_distribution').css("display", "block");
    $('#details_weather_charts_distribution').css("display", "block");
    $('#details_trip_weather_stats').css("display", "block");
}

/**
 * This method shows the Normal Charts for details
 */
function showCharts() {
    $('#details_charts').css("display", "block");
    $('#details_weather_charts').css("display", "block");
}

/**
 * This method hides the Normal Charts for details
 */
function hideCharts() {
    $('#details_charts').css("display", "none");
    $('#details_weather_charts').css("display", "none");
}

// returns wether the elemente is in the viewport or not
$.fn.isOnScreen = function(){
    var win = $(window);

    var viewport = {
        top : win.scrollTop(),
        left : win.scrollLeft()
    };
    viewport.right = viewport.left + win.width();
    viewport.bottom = viewport.top + win.height();

    var bounds = this.offset();
    bounds.right = bounds.left + this.outerWidth();
    bounds.bottom = bounds.top + this.outerHeight();

    return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));
};