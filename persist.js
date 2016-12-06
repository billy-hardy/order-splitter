importScripts('/node_modules/idb-keyval/idb-keyval.js');

self.addEventListener('message', function(e) {
    if(e.data.cmd == 'save') {
        saveOrder(e.data.order);
    }
    else {
        getAllOrders().then(function(orders) {
            self.postMessage(orders);
        });
    }

});

function getUUID() {
    function getFour() {
        function getRandom() {
            return Math.floor(Math.random()*10)+'';
        }
        return getRandom()+getRandom()+getRandom()+getRandom();
    }
    return getFour() + getFour() + getFour() + getFour();
}

function saveOrder({personTotalMap, totalMap}) {
    let orderId = getUUID();
    return idbKeyval.set(orderId, {personTotalMap, totalMap});
}

function getOrder(orderId) {
    return idbKeyval.get(orderId);
}

function getAllOrders() {
    return idbKeyval.keys().then(orders => {
        return orders.map(order => {
            return getOrder(order);
        });
    });
}

