document.addEventListener('DOMContentLoaded', function() {
    var picker = new Pikaday({
        field: document.getElementById('birthdate'),
        format: 'MMMM D, YYYY', // Customize date format to "name of the month day, year"
        yearRange: [1900, new Date().getFullYear()], // Set a range of years
        onSelect: function() {
            // Update the input field with the formatted date
            var formattedDate = this.getMoment().format('MMMM D, YYYY');
            document.getElementById('birthdate').value = formattedDate;
            console.log(formattedDate); // Output selected date
        }
    });
});