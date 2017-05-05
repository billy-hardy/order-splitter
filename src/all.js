class Order {
    constructor() {
        this.people = new Map();
        this.tip = 0;
        this.tax = 0;
        this.nonTaxedFees = 0;
        this.taxedFees = 0;
        this.isTipPercentage = false;
    }

    withTip(tip, asPercentage=false) {
        this.isTipPercentage = asPercentage;
        if(this.isTipPercentage) {
            this._tipPercentage = tip/100;
        }
        else {
            this._tipDollars = tip;
        }
        return this;
    }

    withNonTaxedFees(...fees) {
        this.nonTaxedFees = fees.reduce((acc, val) => acc+val);
        return this;
    }

    withTaxedFees(...fees) {
        this.taxedFees = fees.reduce((acc, val) => acc+val);
        return this;
    }

    withTax(tax) {
        this.tax = tax;
        return this;
    }

    withPerson(name, price) {
        let newPrice = price;
        if(this.people.has(name)) {
            newPrice += this.people.get(name);
        }
        this.people.set(name, newPrice);
        return this;
    }

    get taxPercent() {
        return this.tax/this.subTotal;
    }

    get taxPercentDisplay() {
        return this.taxPercent*100;
    }

    get fee() {
        return this.nonTaxedFees;
    }

    get tipPercent() {
        if(this.isTipPercentage) {
            return this._tipPercentage;
        }
        return this._tipDollars / this.subTotal;
    }

    get tipPercentDisplay() {
        return this.tipPercent * 100;
    }

    get tipDollars() {
        return this.tipPercent * this.subTotal;
    }

    get feesPerPerson() {
        return this.fee/this.people.size;
    }

    get total() {
        return this.subTotal + this.fee + this.tipDollars + this.tax;
    }

    split() {
        let totals = new Map();
        this.subTotal = 0;
        for(let [name, price] of this.people.entries()) {
            this.subTotal += price;
        }
        this.subTotal += this.taxedFees;
        for(let [name, price] of this.people.entries()) {
            let totalForPerson = price;
            totalForPerson += price * this.taxPercent;
            totalForPerson += price * this.tipPercent;
            totalForPerson += this.feesPerPerson;
            totals.set(name, totalForPerson);
        }
        this.totals = totals;
        let totalPrice = Array.from(totals.values()).reduce((acc, val) => acc+val);
        if(Math.round(totalPrice*100) != Math.round(this.total*100)) {
            throw new Error("Everyone's share does not add up to total");
        }
        return this;
    }
}

/**
 * Parses input from a URL query string into an Order.
 * @example
 * parseQueryStringInput('tax=0.30&fee=1.50&tip=1.25&Gus=5.00');
 * @param {string} queryString - The URL query string
 * @returns {Order} An order parsed from the URL query string
 */
function parseQueryStringInput (queryString) {
    var pairs = queryString.split('&');
    let order = new Order();

    for (var i = 0; i < pairs.length; i++) {
        var pairValues = pairs[i].split('=');

        pairValues[1] = Number(pairValues[1]);

        if(pairValues[0] === 'fee') {
            order.withNonTaxedFees(pairValues[1]);
        }
        else if(pairValues[0] === 'tax') {
            order.withTax(pairValues[1]);
        } 
        else if(pairValues[0] === 'tip') {
            order.withTip(pairValues[1]);
        } 
        else {
            order.withPerson(decodeURIComponent(pairValues[0]), pairValues[1]);
        }
    }

    return order;
}

/**
 * Parses the confirmation summary from an OrderUp.com order
 * @param {string} orderUpText - The confirmation summary from OrderUp.com
 * @param {number} fee
 * @param {number} tax
 * @param {number} tip - The tip (either a fixed value or percentage)
 * @param {boolean} isTipPercentage - True if the tip is a percentage as opposed to a fixed value
 * @return {Order} An order parsed from the OrderUp.com confirmation summary
 */
function parseOrderUpInput (orderUpText, fee, tax, tip, isTipPercentage) {
    // TODO: check if the number at the beginning of the line affects the item cost
    // example: 2 Chicken $4.00
    //   should the cost for the person be $4 or $8?

    let order = new Order()
        .withNonTaxedFees(fee)
        .withTax(tax)
        .withTip(tip, isTipPercentage);
    var label = 'Label for:';
    var itemCost = null;
    var array = orderUpText.split('\n');

    for (var i = 0; i < array.length; i++) {
        var line = array[i].trim();
        line = line.replace(/\s+/g, ' '); // replace all whitespace with single space

        if (!itemCost) {
            var dollarIndex = line.lastIndexOf('$');
            if (dollarIndex > -1) {
                itemCost = Number(line.substring(dollarIndex + 1, line.length));
            }
            continue;
        }

        var labelIndex = line.indexOf(label);
        if (labelIndex > -1) {
            var name = line.substring(labelIndex + label.length, line.length);
            order.withPerson(name, itemCost);
            itemCost = null;
        }
    }

    return order;
}

window.onload = init;

function init () {
  document.getElementById("split").addEventListener("click", onSplitButtonClick);
  document.getElementById("percentageCheckbox").addEventListener("click", onPercentageCheckboxClick);
  // check for URL query parameters
  if (window.location.search) {
    var queryString = window.location.search.substring(1); // remove prefixing '?'
    handleOrder(function () {
      return parseQueryStringInput(queryString);
    });
  }

  loadPreferences();
}

/**
 * Loads user preferences from localStorage.
 */
function loadPreferences () {
  if (Storage) {
    if (localStorage.getItem('isTipPercentage') === 'false') {
      // tip is a percentage by default, update if user prefs is 'false'
      updateTipComponents(false);
      document.getElementById('percentageCheckbox').checked = false;
    }
  }
}

function onPercentageCheckboxClick () {
  var isTipPercentage = document.getElementById('percentageCheckbox').checked;
  updateTipComponents(isTipPercentage);

  // save user preference to localStorage
  if (Storage) {
    localStorage.setItem('isTipPercentage', isTipPercentage);
  }
}

/**
 * Updates the tip components according to the tip being a percentage.
 * @param {boolean} isTipPercentage
 */
function updateTipComponents (isTipPercentage) {
  document.getElementById('fixedSpan').hidden = isTipPercentage;
  document.getElementById('percentageSpan').hidden = !isTipPercentage;
}

function onSplitButtonClick () {
  var text = document.getElementById('textarea').value;
  var tax = Number(document.getElementById('taxes').value);
  var fee = Number(document.getElementById('fees').value);
  var tip = Number(document.getElementById('tip').value);
  var isTipPercentage = document.getElementById('percentageCheckbox').checked;

  handleOrder(function () {
    return parseOrderUpInput(text, fee, tax, tip, isTipPercentage);
  });
}

function handleOrder (parserFunction) {
  try {
    var order = parserFunction();
    order.split();
    display(order);
  } catch (error) {
    alert(error);
    console.error(error);
  }
}

function display (order) {

  var calculationsTable = '<table>' +
      '<tr><td>Subtotal:</td><td>$' + prettifyNumber(order.subTotal) + '</td><td>(user input; sum of item costs)</td></tr>' +
      '<tr><td>Tax:</td><td>$' + prettifyNumber(order.tax) + '</td><td>(user input)</td></tr>' +
      '<tr><td>Fees:</td><td>$' + prettifyNumber(order.fee) + '</td><td>(user input)</td></tr>' +
      '<tr><td>Tip:</td><td>$' + prettifyNumber(order.tipDollars) + '</td><td>(' + (order.isTipPercentage ? 'tip percent * subtotal' : 'user input') + ')</td></tr>' +
      '<tr><td>Total:</td><td>$' + prettifyNumber(order.total) + '</td><td>(subtotal + tax + fees + tip)</td></tr>' +
      '<tr><td>Fees per Person:</td><td>$' + prettifyNumber(order.feesPerPerson) + '</td><td>(fees / number of people)</td></tr>' +
      '<tr><td>Tax (Percent):</td><td>' + order.taxPercentDisplay + '%</td><td>(tax / subtotal)</td></tr>' +
      '<tr><td>Tip (Percent):</td><td>' + order.tipPercentDisplay + '%</td><td>(' + (order.isTipPercentage ? 'user input' : 'tip / subtotal') + ')</td></tr>' +
      '</table>';

  var html =
      '<hr>' +
      calculationsTable + '<br>' +
      makeBreakdownDisplay(order) + '<br>' +
      'Publish the following:<br>' +
      '<pre>' + makeTotalsDisplay(order.totals) + '</pre>' +
      makeHyperlink(order.tax, order.fee, order.tip, order.people);

  document.getElementById('result').innerHTML = html;
}

/**
 * Returns a string of a number in the format "#.##"
 * @example
 * prettifyNumber(12); // returns "12.00"
 * @param {number} n - The number to prettify
 * @returns {string} A string of a number rounded and padded to 2 decimal places
 */
function prettifyNumber (n) {
  n = Math.round(n * 100) / 100; // round to 2 decimal places

  // pad to 2 decimal places if necessary
  var s = n.toString();

  if (s.indexOf('.') === -1) {
    s += '.';
  }

  while (s.length < s.indexOf('.') + 3) {
    s += '0';
  }

  return s;
}

/**
 * Returns a listing of names to split costs
 * @param {object} totals - The totals property from the Order
 * @returns {string} A view mapping names to split costs
 */
function makeTotalsDisplay (totals) {
  // get length of longest name
  var longestName = -1;
  for (var [person, price] of totals) {
    longestName = Math.max(person.length, longestName);
  }

  // add 1 to longest name for a space after name
  longestName += 1;

  var output = '';
  var name;
  for (let [person, price] of totals) {
      let name = person;
    for (var i = person.length; i < longestName; i++) {
      name += ' ';
    }
    output += name + '$' + prettifyNumber(price) + '<br>';
  }

  return output;
}

/**
 * Returns a hyperlink to this split order.
 * @param {number} tax - amount of taxes
 * @param {fee} fee - amount of fees
 * @param {number} tip - tip
 * @param {Object} personItemCosts - map of person name to item costs
 * @return {string} The hyperlink to this order
 */
function makeHyperlink (tax, fee, tip, personItemCosts) {
  var link = window.location.origin + window.location.pathname;
  if (link.indexOf('index.html') === -1) {
    link += 'index.html';
  }

  if (tip !== 0) tip = prettifyNumber(tip);

  link += '?tax=' + tax + '&fee=' + fee + '&tip=' + tip;

  for (var [person, val] of personItemCosts) {
    link += '&' + encodeURIComponent(person) + '=' + prettifyNumber(val);
  }

  return '<a href=' + link + '>' + link + '</a>';
}

/**
 * Returns a display breaking down the Order split calculations
 * @param {Order} order - the Order to breakdown
 * @returns {string} A view of the Order breakdown
 */
function makeBreakdownDisplay (order) {
  var breakdown = '<table id="breakdown">';
  breakdown += '<tr><th>Person</th><th>Item Costs</th><th>Tax</th><th>Tip</th><th>Fees Per Person</th><th>Person Total</th></tr>';
  for (var [person, price] of order.people) {
    breakdown += '<tr><td>' + person + '</td><td>' +
        price + '</td><td> + ' + // item costs
        price + ' * ' + order.taxPercent + '</td><td> + ' + // taxes
        price + ' * ' + order.tipPercent + '</td><td> + ' + // tip
        order.feesPerPerson + '</td><td> = ' +
        prettifyNumber(order.totals.get(person)) + '</td></tr>';
  }

  breakdown += '</table>';
  return breakdown;
}
