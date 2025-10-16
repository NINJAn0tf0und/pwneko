
let SwiggyUserDetails = [];
let orderdedItems = [];
let SwiggyUsername, SwiggyUserEmail, SwiggyUserPhoneNumber, fooddyId, gender, totalamount;


const generateUUID = async () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const getSwiggyUserId = async () => {
  const result = await chrome.storage.local.get(["userDetails"]);
  let id = result.userDetails.swiggyUserid;
  return id;
};

const GetDataUser = async (orders) => {
  let datadata = await getitems()
  const userDetails = await getSwiggyUserDetails();
  const userId = await getSwiggyUserId();
  const phoneNumber = userDetails.phoneNumber;
  const totalorder = datadata.length;
  let total = 0;
  let SwiggyUserdata = {
    userId,
    phoneNumber,
    userName: SwiggyUsername,
    emailId: SwiggyUserEmail,
    totalorder: totalorder,
    fooddyId: fooddyId,
    gender,
    totalamount: orders.reduce((total, order) => {
      return !isNaN(order.OrderPrice)
        ? total + Number(order.OrderPrice)
        : total;
    }, total),
  };
  chrome.storage.local.set({
    swiggyTotalAmount: SwiggyUserdata.totalamount,
  });
  return SwiggyUserdata;
};

const SwiggyGroupApiData = async (lastOrder) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await fetch(
        `https://www.swiggy.com/dapi/order/all?order_id=`
      );
      const dataFromApi = await result.json();
      const arrOrders = dataFromApi.data.orders;
      if (arrOrders.length == 0) {
        ProcessDataSwiggy(arrOrders);
        getLastOrderId(arrOrders);
      } else {
        let datadata = await getitems()
        let SwiggyUserdata = await GetDataUser(SwiggyUserDetails);
        const requestData = {
          SwiggyUser: SwiggyUserdata,
          SwiggyOrderedData: datadata,
        };

        // console.log(requestData,'requestdata')

        let generatingid = await generateUUIDD()
        fetch("https://backend.spendingcalculator.xyz/api/swiggydata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        })
          .then((response) => response.json())
          .then((data) => {
            try {
              // setInternalFetching(false);
              const { userDetails } = data;
              let modifiedUserDetails = { ...userDetails };
              if (!modifiedUserDetails.zomatoUserid) {
                modifiedUserDetails.zomatoUserid = generatingid;
              }


            } catch (e) {
              console.log("catch:", e);
            }
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      }

      resolve(dataFromApi);
    } catch (error) {
      reject(error);
    }
  });
};

const getLastOrderId = async (arrOrders) => {
  try {
    let lastOrder = arrOrders.at(-1).order_id;
    if (lastOrder) {
      SwiggyGroupApiData(lastOrder);
    }
    return lastOrder;
  } catch (e) { console.log(e) }
};

const swiggyInit = async () => {
  return new Promise(async (resolve, reject) => {
    fetch(`https://www.swiggy.com/dapi/order/all?order_id$=`)
      .then((result) => result.json())
      .then(async (dataFromApi) => {
        resolve(dataFromApi);
        const arrOrders = dataFromApi.data.orders;
        if (arrOrders.length === 0) {
          // console.log(arrOrders.length )
        } else {
          let SwiggyUsername = arrOrders[0].delivery_address.name;
          let SwiggyUserPhoneNumber = arrOrders[0].delivery_address.mobile;
          let SwiggyUserEmail = arrOrders[0].delivery_address.email;
          await ProcessDataSwiggy(arrOrders);
          await getLastOrderId(arrOrders);
        }
      })
      .catch((errorOccured) => {
        reject(errorOccured);
      });
  });
};

const getYearOnly = (str) => {
  return str.split("-")[0];
};


const findOrderDetails = async (order, total, time) => {
  let items = order.order_items;
  let tempObj = {};

  items.map((o) => {
    tempObj.name = [];
    tempObj.quantity = Number(o.quantity);
    tempObj.name.push(`${tempObj.quantity} x ${o.name}`);
    tempObj.price = total;
    tempObj.year = getYearOnly(time);
    tempObj.Delivery_date = time;
  });
  tempObj.deliveryaddress = order.delivery_address.address_line1;
  tempObj.restaurantname = order.restaurant_name;
  tempObj.restaurantaddress = order.restaurant_address;

  return tempObj;

};

const SwiggyDetails = async (order, total, time) => {
  let items = order.order_items;
  let tempObj = {};


  items.map((o) => {
    tempObj.OrderName = o.name;
    tempObj.quantity = Number(o.quantity);
    tempObj.OrderDate = time;
    tempObj.OrderPrice = total;
  });
  tempObj.RestaurantName = order.restaurant_name;
  tempObj.RestaurantId = parseInt(order.restaurant_id.replace(/"/g, ""));
  tempObj.RestaurantAddress = order.restaurant_address;
  tempObj.OrderId = order.order_id;
  // tempObj.OrderRating=
  tempObj.RestaurantCityName = order.restaurant_city_name;
  tempObj.RestaurantLocality = order.restaurant_locality;
  tempObj.DeliveryAddress = order.delivery_address.address_line1;
  tempObj.RestaurantCovedId = order.restaurant_cover_image;
  let imageurl = `https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_300,h_200,c_fill/${order.restaurant_cover_image}`;
  tempObj.Restauranturl = imageurl;
  return tempObj;
};

const getitems = async () => {
  return SwiggyUserDetails

}
//get final orderdetails of swiggy
const ProcessDataSwiggy = async (d) => {
  await Promise.all(
    d.map(async (e, index) => {
      orderdedItems.push(await findOrderDetails(e, e.net_total, e.order_time));
    })
  );

  await Promise.all(
    d.map(async (e, index) => {
      SwiggyUserDetails.push(await SwiggyDetails(e, e.net_total, e.order_time));
    })
  );
  getitems()
};

const backendCheck = async (platform, data) => {
  // console.log(data,'data')
  if (data !== undefined) {
    const url = `https://backend.spendingcalculator.xyz/existinguser${platform}`;
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    };

    const response = await fetch(url, requestOptions);
    const responseData = await response.json();

    const isOldUser = responseData["oldUser"];
    if (isOldUser) {
      let generatingid = await generateUUID()
      chrome.storage.local.set({
        userDetails: responseData.userDetails,
        fooddyId: responseData?.userDetails?.fooddyId || null
      });
      if (!responseData.userDetails.swiggyUserid) {
        chrome.storage.local.get((data) => {
          let storedUserDetails = data.userDetails;
          let modifiedUserDetails = {
            ...storedUserDetails,
            swiggyUserid: generatingid
          };
          chrome.storage.local.set({
            userDetails: modifiedUserDetails,
          });
        });
      }

    }
    else {
      try {
        let generatingid = await generateUUID()

        chrome.storage.local.set({
          displayName: undefined,
          fooddyId: undefined,
          userDetails: {
            swiggyUserid: generatingid
          },
        });

      } catch (error) {
        console.error('Error during message sending:', error);
      }
    }
    await swiggyInit()
  }
}

const getSwiggyUserDetails = async () => {
  orderdedItems = [];
  SwiggyUserDetails = [];
  try {
    const response = await fetch(
      `https://www.swiggy.com/dapi/order/all?order_id$=`
    );
    const responseData = await response.json();
    const allOrders = responseData?.data?.orders;
    if (!allOrders || !allOrders.length) return;

    const { mobile, email } = allOrders[0].delivery_address;
    const userDetails = { phoneNumber: mobile, emailId: email };
    return userDetails;
  } catch (err) {
    console.log(err);
  }
};

const isUserExistsInSwiggy = async () => {
  const dataToSend = await getSwiggyUserDetails();
  // console.log(dataToSend,'data to send')
  backendCheck("swiggy", dataToSend);
};

const swiggyLoginStatus = async () => {
  const navbar = document.querySelector(".global-nav ul");
  if (!navbar) {
    const svg = document.querySelector("svg");
    const target = svg.parentNode.lastChild;
    if (target.tagName === "A") { }
  }
  const targetNode = navbar?.children[1]?.firstChild?.firstChild;

  if (targetNode?.tagName === "DIV") { }

};

chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
  if (message.action === "matchedDomain" && message.data.a == true) {
    console.log("excecuting")
    await swiggyLoginStatus()
    await isUserExistsInSwiggy()
  }
});