const urlApi = 'https://ort-tallermoviles.herokuapp.com/api/';

let myMap,
  modal,
  nav,
  userConnected,
  userPosition,
  tags = ['todas'];

ons.ready(appStart);
document.addEventListener('deviceready', deviceReadyHandler, false);

function appStart() {
  modal = $('#spinnerModal')[0];
  nav = $('#nav')[0];
  checkPreviousSession();

  if (window.localStorage.getItem('favorites') === null) {
    window.localStorage.setItem('favorites', JSON.stringify([]));
  }
}

window.addEventListener('cordovacallbackerror', function (event) {
  ons.notification.alert(event.error);
});

function deviceReadyHandler() {
  navigator.geolocation.getCurrentPosition(
    function (dataGeoLocation) {
      userPosition = {
        lat: dataGeoLocation.coords.latitude,
        lon: dataGeoLocation.coords.longitude,
      };
      window.QRScanner.prepare((err, status) => {
        if (err) {
          return ons.notification.toast('permiso a camara no permitido', {
            timeout: 1000,
          });
        }
        if (status.authorized) {
        } else if (status.denied) {
        } else {
          ons.notification.toast('nos cancelaron una sola vez', {
            timeout: 2000,
          });
        }
      });
    },
    function (positionError) {
      console.log(positionError);
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
    }
  );

  document.addEventListener(
    'offline',
    function () {
      nav.pushPage('offline.html');
    },
    false
  );

  document.addEventListener(
    'online',
    function () {
      nav.popPage();
    },
    false
  );
}

function checkPreviousSession() {
  let authToken = window.localStorage.getItem('x-auth');
  if (authToken != null) {
    tokenLogin(authToken);
  }
}

function toggleLoader(on) {
  if (on) {
    modal.show();
  } else {
    modal.hide();
  }
}

function registerHandler() {
  const name = $('#divRegistro #txtNombre').val();
  const lName = $('#divRegistro #txtApellido').val();
  const address = $('#divRegistro #txtDireccion').val();
  const mail = $('#divRegistro #txtCorreo').val();
  const pass = $('#divRegistro #txtPassword').val();

  if (name.trim().length === 0) {
    ons.notification.alert('Debe ingresar nombre', { title: 'Error' });
  } else if (lName.trim().length === 0) {
    ons.notification.alert('Debe ingresar apellido', { title: 'Error' });
  } else if (address.trim().length === 0) {
    ons.notification.alert('Debe ingresar dirección', { title: 'Error' });
  } else if (mail.trim().length === 0) {
    ons.notification.alert('Debe ingresar correo', { title: 'Error' });
  } else if (pass.trim().length < 8) {
    ons.notification.alert('Password debe ser de largo 8, al menos', {
      title: 'Error',
    });
  } else {
    toggleLoader(true);

    $.ajax({
      type: 'POST',
      url: urlApi + 'usuarios',
      contentType: 'application/json',
      data: JSON.stringify({
        email: mail,
        password: pass,
        nombre: name,
        apellido: lName,
        direccion: address,
      }),
      success: function (response) {
        ons.notification.alert('Se ha registrado correctamente', {
          title: 'Éxito!',
        });
        nav.resetToPage('login.html');
      },
      error: function (response) {
        console.log(response);
        ons.notification.alert(
          'Error verifique información y envíe nuevamente',
          { title: 'Error' }
        );
      },
      complete: function () {
        toggleLoader(false);
      },
    });
  }
}

function loginHandler() {
  const mail = $('#divLogin #txtCorreo').val();
  const pass = $('#divLogin #txtPassword').val();

  if (mail.trim().length === 0) {
    ons.notification.alert('Debe ingresar correo', { title: 'Error' });
  } else if (pass.trim().length === 0) {
    ons.notification.alert('Debe ingresar password', { title: 'Error' });
  } else {
    toggleLoader(true);
    $.ajax({
      type: 'POST',
      url: urlApi + 'usuarios/session',
      contentType: 'application/json',
      data: JSON.stringify({ email: mail, password: pass }),
      success: function (response) {
        ons.notification.toast(`Bienvenido, ${response.data.nombre}!`, {
          timeout: 1200,
        });
        window.localStorage.setItem('x-auth', response.data.token);
        userConnected = response.data;
        nav.replacePage('nav.html');
      },
      error: function (response) {
        console.log(response.error);
        ons.notification.alert(response.error, {
          title: 'Error!',
        });
      },
      complete: function () {
        toggleLoader(false);
      },
    });
  }
}

function tokenLogin(authToken) {
  toggleLoader(true);
  $.ajax({
    type: 'GET',
    url: urlApi + 'usuarios/session',
    contentType: 'application/json',
    headers: { 'x-auth': authToken },
    success: function (reponse) {
      nav.replacePage('nav.html');
      userConnected = {
        nombre: reponse.data.nombre,
        apellido: reponse.data.apellido,
        email: reponse.data.email,
        direccion: reponse.data.direccion,
        token: authToken,
      };
    },
    error: function (response) {
      console.log(response.error);
      ons.notification.alert('Su sesión ha expirado.', { title: 'Error' });
    },
    complete: function () {
      toggleLoader(false);
    },
  });
}

function getProducts(options = {}) {
  toggleLoader(true);
  $('#product-list').empty();
  let ajaxUrl = urlApi + 'productos';
  console.log(options);
  if (options.filter != undefined) ajaxUrl += '?nombre=' + options.filter;
  if (options.qr != undefined) ajaxUrl = options.qr;
  $.ajax({
    type: 'GET',
    url: ajaxUrl,
    contentType: 'application/json',
    headers: { 'x-auth': userConnected.token },
    success: function (response) {
      if (response.data.length > 0) {
        let userFavList = getUserFavorites();
        for (let prod of response.data) {
          getTagsFromProducts(prod.etiquetas);
          if (userFavList.includes(prod._id))
            $('#product-list').append(productCardComponent(prod, 'fav'));
          else $('#product-list').append(productCardComponent(prod, 'no-fav'));
        }
        addTagsToSelect();
      } else {
        $('#product-list').append(`
          <ons-card id="msgFav">
            <div class="title">
              La busqueda <strong>${filter}</strong> no encuentra productos para mostrar.
            </div>
          </ons-card>
        `);
      }
    },
    error: function (reponse) {
      console.log(reponse.error);
      ons.notification.alert('Error al obtener lista de productos', {
        title: 'Error',
      });
    },
    complete: function () {
      toggleLoader(false);
    },
  });
}

function productCardComponent(prod, favClass, favPage = false) {
  let favHandlerArg = '';
  if (favPage) favHandlerArg = ', true';
  return `
  <ons-card class="product-list-card">
    <div onclick="goToDetails('${prod._id}')">
      <img  src="https://ort-tallermoviles.herokuapp.com/assets/imgs/${
        prod.urlImagen
      }.jpg" 
      onerror="this.src='./assets/img/default.png'" >
      <div class="card__title center">${prod.nombre}</div>            
    </div>
    <ons-list>
      <ons-list-item>
        <span class="left">${prod.estado}</span>
        <strong class="right">$${prod.precio}</strong>
      </ons-list-item>
      <ons-list-item>
        <div class="center">${prod.etiquetas.join(' | ')}</div>
      </ons-list-item>
      <ons-list-item>
        <span class="left">${prod.codigo}</span>
        <ons-icon 
          class="${favClass} ${prod._id}"
          icon="fa-star" 
          onclick="favHandler('${prod._id}'${favHandlerArg})">
        </ons-icon>
      </ons-list-item>        
    <ons-list>          
  </ons-card>`;
}

function productFilter() {
  let searchFilter = $('ons-search-input').val();
  getProducts({ filter: searchFilter });
}

function getTagsFromProducts(pTags) {
  for (let t of pTags) if (!tags.includes(t)) tags.push(t);
}

function addTagsToSelect() {
  $('#tags-select select').empty();
  for (let t of tags) $('#tags-select select').append(new Option(t, t));
}

function filterByTags() {
  let tag = $('#tags-select select').val();
  let products = $('.product-list-card');

  for (const p of products) {
    if (p.innerText.includes(tag) || tag == 'todas') p.style.display = 'block';
    else p.style.display = 'none';
  }
}

function scanQr() {
  if (window.QRScanner) {
    $('.page__content').hide();
    window.QRScanner.show((status) => {
      window.QRScanner.scan(scanCallback);
    });
  }
}

function scanCallback(err, qrResult) {
  if (err) {
    ons.notification.alert({ message: JSON.stringify(err), title: 'Error' });
  } else {
    ons.notification.toast(qrResult, { timeout: 2000 });

    window.QRScanner.destroy(() => {
      getProducts({ qr: qrResult });
      $('.page__content').show();
    });
  }
}

function loadDetails() {
  toggleLoader(true);
  $.ajax({
    type: 'GET',
    url: urlApi + `productos/${this.data.productId}`,
    contentType: 'application/json',
    headers: { 'x-auth': userConnected.token },
    success: function (response) {
      let prod = response.data;
      let userFavList = getUserFavorites();
      let favClass, orderBtnDisabled;
      if (userFavList.includes(prod._id)) favClass = 'fav';
      else favClass = 'no-fav';
      if (prod.estado == 'en stock') orderBtnDisabled = '';
      else orderBtnDisabled = 'disabled';

      $('#product-details').html(`
      <ons-card class="product-detail-card">
        <div>
          <img  src="https://ort-tallermoviles.herokuapp.com/assets/imgs/${
            prod.urlImagen
          }.jpg" 
          onerror="this.src='./assets/img/default.png'" >
          <div class="card__title center">${prod.nombre}</div>            
        </div>
        <ons-list>
          <ons-list-item>
            <span class="left">${prod.estado}</span>
            <strong class="right">$${prod.precio}</strong></ons-list-item>
          <ons-list-item>
            <div class="center">${prod.etiquetas.join(' | ')}</div>
          </ons-list-item>
          <ons-list-item>
            <span class="left">${prod.descripcion}</span>
            <span>Puntaje: ${prod.puntaje}</span>
          </ons-list-item>
          <ons-list-item>
            <span class="left">${prod.codigo}</span>
            <ons-icon 
              class="${favClass} ${prod._id}" 
              icon="fa-star" 
              onclick="favHandler('${prod._id}')">
              </ons-icon>
          </ons-list-item>
        </ons-list>        
        <ons-button modifier="large" onclick="goToCreateOrder()" ${orderBtnDisabled}>Realizar Pedido</ons-button>
      </ons-card>
      `);

      window.localStorage.setItem('prod', JSON.stringify(prod));
    },
    error: function (reponse) {
      console.log(reponse.error);
      ons.notification.alert('Error al obtener detalle del producto', {
        title: 'Error',
      });
    },
    complete: function () {
      toggleLoader(false);
    },
  });
}

function loadCreateOrderDetails() {
  let prod = JSON.parse(window.localStorage.getItem('prod'));
  getSucursales('select');
  $('#order-details').html(`
  <ons-card class="product-order-card">
    <div>
      <img src="https://ort-tallermoviles.herokuapp.com/assets/imgs/${prod.urlImagen}.jpg" 
      onerror="this.src='./assets/img/default.png'" >
      <div class="card__title center">${prod.nombre}</div>            
    </div>
    <div class="flex-space-between">
      <span>Cantidad: </span>
      <input 
        modifier="large" 
        id="orderQty" 
        type="number" 
        value="1"
        min="0"
        oninput="updateOrderPrice(${prod.precio})"           
      </input>
      <span>Total: 
        <strong id="orderPrice"> $ ${prod.precio}</strong>
      </span>
    </div>
    <div class="flex-space-between">
      <span>Sucursal: </span>
      <ons-select id="sucursales-select" modifier="underbar">             
      </ons-select>    
    </div>
    <ons-button id="createOrderBtn" modifier="large" onclick="createOrder('${prod._id}')">Crear Pedido</ons-button>
    <div id="mapId"></div>
  </ons-card>
  `);

  loadMap();
}

function createOrder(pId) {
  let qty = $('#orderQty').val();
  let sId = $('#sucursales-select').val();

  if (qty < 0 || qty == '') {
    ons.notification.alert('Ingrese cantidad valida.', { title: 'Error' });
  } else if (sId.trim().length === 0) {
    ons.notification.alert('Seleccione sucursal', { title: 'Error' });
  } else {
    toggleLoader(true);
    $.ajax({
      type: 'POST',
      url: urlApi + 'pedidos',
      contentType: 'application/json',
      headers: { 'x-auth': userConnected.token },
      data: JSON.stringify({
        cantidad: qty,
        idProducto: pId,
        idSucursal: sId,
      }),
      success: function (response) {
        nav.resetToPage('nav.html');
        // fail: navegar directamente a mis pedidos
        //{   callback: () => nav.replacePage('myOrders.html'),
        // }

        ons.notification.alert('Toca Mis Pedidos para ver tu pedido.', {
          title: 'Pedido creado!',
        });
        window.localStorage.removeItem('prod');
      },
      error: function (response) {
        console.log(response.error);
        ons.notification.alert('Error al crear el pedido', { title: 'Error' });
      },
      complete: function () {
        toggleLoader(false);
      },
    });
  }
}

function loadMap() {
  let blueIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  if (myMap !== undefined) {
    myMap = myMap.remove();
  }
  myMap = L.map('mapId', { tap: false }).setView(
    [userPosition.lat, userPosition.lon],
    15
  );
  L.tileLayer(
    'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}',
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken:
        'pk.eyJ1Ijoic2JhZnNrIiwiYSI6ImNrczJremw1azE0MmMyeHRqbXd3dnJpa3QifQ.PAnY9i3Xd3l_eExAHrv5Wg',
    }
  ).addTo(myMap);

  let userMarker = L.marker([userPosition.lat, userPosition.lon], {
    icon: blueIcon,
  }).addTo(myMap);
  userMarker.bindPopup('<b>Aquí estoy!</b>').openPopup();
  getSucursales('map');
}

function setSucursalesOnMap(sucursales) {
  let greenIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  for (let s of sucursales) {
    $.ajax({
      method: 'GET',
      url: `http://nominatim.openstreetmap.org/search?format=json&street=${s.direccion}&country=Uruguay&city=Montevideo`,
      success: function (response) {
        if (response.length > 0) {
          let location = response[0];
          let marker = L.marker([location.lat, location.lon], {
            icon: greenIcon,
          }).addTo(myMap);

          let distanceMts = myMap.distance(
            [userPosition.lat, userPosition.lon],
            [location.lat, location.lon]
          );
          let distanceKm = (distanceMts / 1000).toFixed(2);
          marker.bindPopup(`<b>${s.nombre}</b><br>Distancia ${distanceKm} km`);
        }
      },
      error: function (error) {
        console.log(error);
      },
    });
  }
}

function getSucursales(action) {
  $.ajax({
    type: 'GET',
    url: urlApi + 'sucursales',
    contentType: 'application/json',
    headers: { 'x-auth': userConnected.token },
    success: function (response) {
      let sucursales = response.data;
      if (action == 'select') {
        for (let s of sucursales)
          $('#sucursales-select select').append(new Option(s.nombre, s._id));
      } else if (action == 'map') {
        setSucursalesOnMap(sucursales);
      }
    },
    error: function (reponse) {
      console.log(reponse.error);
      ons.notification.alert('Error al obtener las sucursales', {
        title: 'Error',
      });
    },
    complete: function () {
      toggleLoader(false);
    },
  });
}

function updateOrderPrice(price) {
  let qty = $('#orderQty').val();
  if (qty < 0 || qty == '') {
    ons.notification.toast('Seleccione una cantidad valida.', {
      timeout: 1200,
    });
    $('#createOrderBtn').prop('disabled', true);
  } else {
    $('#orderPrice').html('$ ' + qty * price);
    $('#createOrderBtn').prop('disabled', false);
  }
}

function getOrders() {
  toggleLoader(true);
  $('#order-list').empty();
  $.ajax({
    type: 'GET',
    url: urlApi + 'pedidos',
    contentType: 'application/json',
    headers: { 'x-auth': userConnected.token },
    success: function (response) {
      let stringHtmlList = '';
      for (let order of response.data.reverse()) {
        let closeOrderBtnDisabled = 'disabled';
        let comment = '';
        if (order.estado == 'pendiente') {
          closeOrderBtnDisabled = '';
        } else {
          comment = `<span>Comentario: ${order.comentario}</span>`;
        }
        $('#order-list').append(`
          <ons-card class="product-list-card">
            <div>
              <img  src="https://ort-tallermoviles.herokuapp.com/assets/imgs/${
                order.producto.urlImagen
              }.jpg" 
              onerror="this.src='./assets/img/default.png'" >
              <div class="card__title center">${
                order.producto.nombre
              }</div>            
            </div>
            <ons-list>
              <ons-list-item>
                <span class="left">${order.estado}</span>
                <span class="center">Cantidad ${order.cantidad}</span>
                <strong class="right">$${
                  order.producto.precio * order.cantidad
                }</strong>
              </ons-list-item>
              <ons-list-item>
                <div class="center">${order.producto.etiquetas.join(
                  ' | '
                )}</div>
              </ons-list-item>
              <ons-list-item>
                <span class="left">${order.producto.codigo}</span>
                <span class="right">Sucursal: ${order.sucursal.nombre}
              </ons-list-item>            
              <ons-list-item>
                ${comment}
              </ons-list-item>                
            <ons-list>  
            <ons-button 
              id="closeOrderBtn" 
              modifier="large" 
              onclick="closeOrder('${order._id}')" 
              ${closeOrderBtnDisabled}>
                Cerrar Pedido
              </ons-button>     
          </ons-card>`);
      }
    },
    error: function (reponse) {
      console.log(reponse.error);
      ons.notification.alert('Error al obtener lista de pedidos', {
        title: 'Error',
      });
    },
    complete: function () {
      toggleLoader(false);
    },
  });
}

function closeOrder(pId) {
  ons.notification.prompt({
    title: 'Cerrar Pedido',
    message: 'Ingrese un comentario por favor.',
    callback: function (comment) {
      if (comment == '') {
        ons.notification.alert('Debe ingresar un commentario.');
      } else {
        $.ajax({
          type: 'PUT',
          url: urlApi + 'pedidos/' + pId,
          contentType: 'application/json',
          headers: { 'x-auth': userConnected.token },
          data: JSON.stringify({
            comentario: comment,
          }),
          success: function (response) {
            ons.notification.alert({
              message: 'Gracias por su preferencia.',
              title: 'Pedido cerrado',
            });
            getOrders();
          },
          error: function (reponse) {
            console.log(reponse.error);
            ons.notification.alert('Error al cerrar el pedido.', {
              title: 'Error',
            });
          },
          complete: function () {
            toggleLoader(false);
          },
        });
      }
    },
  });
}

function favHandler(pId, favPage = false) {
  let favList = JSON.parse(window.localStorage.getItem('favorites'));
  let msg = '';
  let userFavList = favList.find((item) => {
    return item.email === userConnected.email;
  });

  if (userFavList === undefined) {
    let newItem = {
      email: userConnected.email,
      products: [pId],
    };
    favList.push(newItem);
    $(`.${pId}`).removeClass('no-fav');
    $(`.${pId}`).addClass('fav');
    msg = 'Producto agregado a favoritos';
  } else {
    let pIndex = userFavList.products.indexOf(pId);
    if (pIndex === -1) {
      userFavList.products.push(pId);
      $(`.${pId}`).removeClass('no-fav');
      $(`.${pId}`).addClass('fav');
      msg = 'Producto agregado a favoritos';
    } else {
      userFavList.products.splice(pIndex, 1);
      $(`.${pId}`).removeClass('fav');
      $(`.${pId}`).addClass('no-fav');
      msg = 'Producto eliminado de favoritos';
    }
  }
  ons.notification.toast(msg, { timeout: 1200 });
  let favString = JSON.stringify(favList);
  window.localStorage.setItem('favorites', favString);
  if (favPage) getFavorites();
}

function getFavorites() {
  const userFavList = getUserFavorites();
  $('#favoriteList').empty();
  if (userFavList.length > 0) {
    for (let pId of userFavList) {
      $.ajax({
        type: 'GET',
        url: urlApi + `productos/${pId}`,
        contentType: 'application/json',
        headers: { 'x-auth': userConnected.token },
        success: function (response) {
          let prod = response.data;
          $('#favoriteList').append(productCardComponent(prod, 'fav', true));
        },
        error: function (reponse) {
          console.log(reponse.error);
          ons.notification.alert(
            `Error al obtener detalle del producto id:${pId}`,
            {
              title: 'Error',
            }
          );
        },
        complete: function () {
          toggleLoader(false);
        },
      });
    }
  } else {
    ons.notification.alert(`No tiene productos favoritos para mostrar.`);
    $('#favoriteList').append(
      `<ons-card id="msgFav">
        <div class="title">
        Puede agregar productos a su lista de favoritos 
        desde el listado de productos tocando en la estrella.
        <ons-icon           
          class="no-fav"
          icon="fa-star"           
        </ons-icon>
        </div>
      </ons-card>`
    );
  }
}

function getUserFavorites() {
  let userFavList = [];
  let favList = JSON.parse(window.localStorage.getItem('favorites'));
  if (favList == null) {
    window.localStorage.setItem('favorites', []);
  } else {
    let userItem = favList.find((item) => {
      return item.email === userConnected.email;
    });
    if (userItem != undefined) userFavList = userItem.products;
  }
  return userFavList;
}

function goToRegister() {
  nav.resetToPage('register.html');
}

function goToLogin() {
  nav.resetToPage('login.html');
}

function logout() {
  userConnected = null;
  window.localStorage.removeItem('x-auth');
  goToLogin();
}

function goToDetails(pId) {
  nav.pushPage('details.html', { data: { productId: pId } });
}

function goToCreateOrder() {
  nav.pushPage('createOrder.html');
}

// function goToQrScan() {
//   nav.pushPage('qr-scan-page.html');
// }

// function scanPageBack() {
//   if (window.QRScanner) {
//     window.QRScanner.hide();
//   }
// }
