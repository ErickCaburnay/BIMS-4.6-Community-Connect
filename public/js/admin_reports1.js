document.addEventListener("DOMContentLoaded", function () {
    var printButton = document.getElementById("printButton");
    var addRowButton = document.getElementById("addRowButton");
    var deleteRowButton = document.getElementById("deleteRowButton");
  
    function printContent() {
      addRowButton.style.display = "none";
      deleteRowButton.style.display = "none";
      printButton.style.display = "none";
  
      window.print();
    }
  
    function addRow() {
      var table = document
        .getElementById("items")
        .getElementsByTagName("tbody")[0];
      var newRow = document.createElement("tr");
      newRow.className = "item-row";
      newRow.innerHTML = `
            <td><div class="contenteditable" contenteditable="true"></div></td>
            <td><div class="contenteditable" contenteditable="true"></div></td>
            <td><div class="contenteditable" contenteditable="true"></div></td>
            <td><div class="contenteditable" contenteditable="true"></div></td>
            <td><div class="contenteditable" contenteditable="true"></div></td>
          `;
      table.appendChild(newRow);
    }
  
    function deleteRow() {
      var table = document
        .getElementById("items")
        .getElementsByTagName("tbody")[0];
      var rows = table.getElementsByClassName("item-row");
      if (rows.length > 0) {
        table.removeChild(rows[rows.length - 1]);
      }
    }
  
    printButton.addEventListener("click", printContent);
    addRowButton.addEventListener("click", addRow);
    deleteRowButton.addEventListener("click", deleteRow);
  
    window.onafterprint = function () {
      addRowButton.style.display = "block";
      deleteRowButton.style.display = "block";
      printButton.style.display = "block";
    };
  });
  