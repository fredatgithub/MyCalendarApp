﻿$(document).ready(function () {
    var events = [];
    var selectedEvent = null;

    GetEventAndRenderCalendar();

    function GetEventAndRenderCalendar() {
        events = []; // clear events list

        // get all existing events from event service and map them to fullcalendar event format
        $.ajax({
            type: "GET",
            url: "/Home/GetEvents",
            success: function (data) {
                $.each(data, function () {
                    events.push({
                        id: this.id,
                        title: this.title,
                        description: this.description,
                        start: this.startTime,
                        end: this.endTime !== null ? moment(this.endTime) : null,
                        color: this.color,
                        allDay: this.isFullDay
                    });
                });
                RenderCalendar(events);
            },
            error: function (error) {
                alert('failed');
            }
        });
    }

    function RenderCalendar(events) {
        $('#calendar').fullCalendar('destroy');
        $('#calendar').fullCalendar({
            timeFormat: 'h(:mm)a',
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,agendaWeek,agendaDay'
            },
            firstDay: 1, //The day that each week begins (Monday=1)
            plugins: ['bootstrap'],
            themeSystem: 'bootstrap',
            slotMinutes: 60,
            eventLimit: true,
            eventColor: '#7b1dad',
            eventTextColor: '#ffffff',
            events: events,
            eventClick:
                function (calEvent, jsEvent, view) {
                    selectedEvent = calEvent;
                    $('#eventInfoModal #eventTitle').text(calEvent.title);
                    var $description = $('<div/>');
                    $description.append($('<p/>').html('<b>Start Time:</b> ' + calEvent.start.format("MMM-DD-YYYY HH:mm a")));
                    if (calEvent.end !== null) {
                        $description.append($('<p/>').html('<b>End Time:</b> ' + calEvent.end.format("MMM-DD-YYYY HH:mm a")));
                    }
                    if (calEvent.description === null) {
                        $description.append($('<p/>').html('<b>Description:</b> ' + 'N/A'));
                    }
                    else {
                        $description.append($('<p/>').html('<b>Description:</b> ' + calEvent.description));
                    }
                    $('#eventInfoModal #pDetails').empty().html($description);

                    $('#eventInfoModal').modal();
                },
            selectable: true,
            select: function (startTime, endTime) {
                selectedEvent = {
                    eventID: 0,
                    title: '',
                    description: '',
                    start: startTime,
                    end: endTime,
                    allDay: false,
                    color: ''
                };
                openAddEditForm();
                $('#calendar').fullCalendar('unselect');
            },
            editable: true, // TODO: Figure out how to drag/drop events in the future
            eventDrop: function (event) {
                var data = {
                    Id: event.id,
                    Title: event.title,
                    StartTime: event.start.format('MM/DD/YYYY HH:mm A'),
                    EndTime: event.end !== null ? event.end.format('MM/DD/YYYY HH:mm A') : null,
                    Description: event.description,
                    Color: event.color,
                    IsFullDay: event.allDay
                };
                SaveEvent(data);
            }
        });
    }

    $('#btnEdit').click(function () {
        openAddEditForm(); // open add/edit modal 
    });

    // Delete event when "Delete Event" button is pressed
    $('#btnDelete').click(function () {
        swal({
            title: "Are you sure you want to delete this event?",
            icon: "warning",
            buttons: true,
            dangerMode: true
        })
            .then((willDelete) => {
                if (willDelete) {
                    $.ajax({
                        type: "POST",
                        url: 'Home/DeleteEvent',
                        data: { 'eventID': selectedEvent.id },
                        success: function (data) {
                            if (data) {
                                // Refresh calendar
                                GetEventAndRenderCalendar();
                                $('#eventInfoModal').modal('hide');
                                alertify.success("Event successfully deleted");
                            }
                            else {
                                alertify.error("Event not successfully deleted");
                            }
                        },
                        error: function () {
                            alertify.error("Error: Event not deleted");
                        }
                    });
                }
            });
    });


    // TODO: Figure out why clock doesn't display
    $('#txtStart,#dtp2').datetimepicker({
        format: 'MM/DD/YYYY HH:mm A'
    });

    $('#chkIsFullDay').change(function () {
        if ($(this).is(':checked')) {
            $('#divEndDate').hide();
        }
        else {
            $('#divEndDate').show();
        }
    });

    function openAddEditForm() {
        if (selectedEvent !== null) {
            $('#hdEventID').val(selectedEvent.id);
            $('#txtSubject').val(selectedEvent.title);

            //TODO: Format to display in date input box
            $('#txtStart').val(selectedEvent.start.format('MM/DD/YYYY HH:mm A'));

            $('#chkIsFullDay').prop("checked", selectedEvent.allDay || false);
            $('#chkIsFullDay').change();
            //$('#txtEnd').val(selectedEvent.end !== null ? selectedEvent.end.format('MM/DD/YYYY HH:mm A') : '');
            $('#txtEnd').val(selectedEvent.end.format('MM/DD/YYYY HH:mm A'));
            $('#txtDescription').val(selectedEvent.description);
            $('#ddThemeColor').val(selectedEvent.color);
        }
        $('#eventInfoModal').modal('hide');
        $('#addEditEventModal').modal();
    }

    $('#btnSave').click(function () {
        if ($('#txtSubject').val().trim() === "") {
            alert('Event title required');
            return;
        }

        if ($('#txtStart').val().trim() === "") {
            alert('Start date required');
            return;
        }

        if ($('#chkIsFullDay').is(':checked') === false && $('#txtEnd').val().trim() === "") {
            alert('Please specify an end date');
            return;
        }
        else {
            var startDate = moment($('#txtStart').val(), "MM/DD/YYYY HH:mm A").toDate();
            var endDate = moment($('#txtEnd').val(), "MM/DD/YYYY HH:mm A").toDate();
            if (startDate > endDate) {
                alert('Invalid end date');
                return;
            }
        }

        // Create the event
        // TODO: Add image and tag properties later
        var event = {
            Id: $('#hdEventID').val().trim(),
            Title: $('#txtSubject').val().trim(),
            StartTime: $('#txtStart').val().trim(),
            EndTime: $('#chkIsFullDay').is(':checked') ? null : $('#txtEnd').val().trim(),
            Description: $('#txtDescription').val(),
            Color: $('#ddThemeColor').val(),
            IsFullDay: $('#chkIsFullDay').is(':checked')
        };

        // Save new event
        SaveEvent(event);
        $('#addEditEventModal').modal('hide');
    });

    // Send a POST request for HomeController to handle saving an event
    function SaveEvent(data) {
        $.ajax({
            type: "POST",
            url: '/Home/SaveEvent',
            data: data,
            success: function (data) {
                if (data) {
                    // Refresh calendar
                    GetEventAndRenderCalendar();
                    alertify.success('Event added successfully!');
                }
            },
            error: function () {
                alertify.error('Event save failed :(');
            }
        });
    }

}); 