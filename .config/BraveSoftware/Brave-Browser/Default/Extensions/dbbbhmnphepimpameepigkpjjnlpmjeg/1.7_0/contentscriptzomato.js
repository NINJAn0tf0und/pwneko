
let zomatouserList = []; //for Zomato data
let ZomatoDataList = [];
let zomatoorderCount; //Total zomatoorderCounts from the first api call
let ZomatoUserDataObject = {};
let zomatoprocessedOrders = [];
let zomatopageNumber = 0;
let stopFetching = false
let triggerZomatoDataAPI = false
let zomatoexistingusertotalordercount
let processZomatoDataRequest = false


const zomatoInit = async () => {
  zomatouserList = [];
  ZomatoDataList = [];
  ZomatoUserDataObject = {};
  zomatoprocessedOrders = [];
  zomatopageNumber = 1;
  return new Promise(async (resolve, reject) => {
    fetch(`https://www.zomato.com/webroutes/user/orders?page=1`)
      .then((result) => result.json())
      .then(async (dataFromApi) => {
        resolve(dataFromApi);
        zomatoorderCount = dataFromApi.sections.SECTION_USER_ORDER_HISTORY.count;
        if (zomatoorderCount === 0) { }
        else {
          await getNextpage(
            dataFromApi.sections.SECTION_USER_ORDER_HISTORY.totalPages
          );
        }
      })
      .catch((errorOccured) => {
        reject(errorOccured);
      });
  });
};

const generateUUIDD = async () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const getUserIdd = async () => {
  chrome.storage.local.get(async (data) => {
    // let userZomatoid = data.userDetails[0]?data.userDetails[0].zomatoUserid : data.userDetails.zomatoUserid
    let userZomatoid = data.userDetails.zomatoUserid

    return userZomatoid;
  });
}

const getNextpage = async (count) => {
  chrome.storage.local.get(async (data) => {
    // console.log(data.userDetails,'userDetails')
    // let userZomatoid = data.userDetails[0]?data.userDetails[0].zomatoUserid : data.userDetails.zomatoUserid
    let userZomatoid = data.userDetails.zomatoUserid

    // console.log(userZomatoid,'userzomatoid')
    let requestdata = { userId: userZomatoid }

    const response = await fetch('https://backend.spendingcalculator.xyz/api/getlastzomatoorderid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: "https://www.zomato.com", },
      body: JSON.stringify(requestdata)
    });

    responsedata = await response.json();

    if (responsedata.data === "null") {
      for (let i = 1; i <= count; i++) {
        await newgroupApiData(i, count);
      }
    }

    else {
      let providedOrderId = parseInt(responsedata.data.last_order_id);
      let zomatototalamount = parseInt(responsedata.data.total_amount);
      zomatoexistingusertotalordercount = parseInt(responsedata.data.total_orders);

      await chrome.storage.local.set({ zomatoTotalAmount: zomatototalamount });

      for (let i = 1; i <= count; i++) {
        if (!stopFetching) {
          await groupApiData(i, providedOrderId);
        }
      }
    }
  });
};

const groupApiData = async (lastOrder, providedOrderId) => {
  return new Promise(async (resolve, reject) => {
    fetch(`https://www.zomato.com/webroutes/user/orders?page=${lastOrder}`)
      .then(async (result) => result.json())
      .then(async (dataFromApi) => {

        const orders = Object.values(dataFromApi.entities.ORDER);

        orders.forEach(item => {
          item.orderDate = new Date(item.orderDate.replace(' at', ','));
        });

        let sortedData = orders.sort((a, b) => b.orderDate - a.orderDate);
       
        orders.sort((a, b) => b.orderDate - a.orderDate);

        const index = orders.findIndex(order => order.orderId === providedOrderId);
        if (index !== -1) {
          let filteredOrders = orders.filter((order, idx) => idx < index);
          dataFromApi.entities.ORDER = Object.fromEntries(filteredOrders.map(order => [order.orderId, order]));
          // const filteredOrdersWithDistinctDate = filteredOrders.filter(order => {
          //   return !orders.some(otherOrder => {
          //     return otherOrder.orderDate.getTime() === order.orderDate.getTime() && otherOrder.orderId !== order.orderId;
          //   });
          // });

          // console.log(filteredOrdersWithDistinctDate, 'filteredOrdersWithDistinctDate');

          async function findMatchingOrders(filteredOrders, orders) {
           
            let matchFound = [];
            for (let filteredOrder of filteredOrders) {
                let isMatched = orders.some(order => {
                 
                    return order.orderId !== filteredOrder.orderId && JSON.stringify(order.orderDate) === JSON.stringify(filteredOrder.orderDate);
                });
                if (isMatched) {
                    matchFound.push(filteredOrder);
                }
            }
            return matchFound;
        }
        let getmatchedOrders = await findMatchingOrders(filteredOrders, orders)

      
          if(getmatchedOrders.length > 0){
            filteredOrders = []
          }

          let finalordercount = filteredOrders.length + zomatoexistingusertotalordercount
          await processzomatodata(dataFromApi, finalordercount);
          resolve(dataFromApi)
          stopFetching = true
          zomatopageNumber += 1;
        }

        if (!stopFetching) {
          zomatoexistingusertotalordercount = zomatoexistingusertotalordercount + 10
          await processzomatodata(dataFromApi);
          resolve(dataFromApi)
          zomatopageNumber += 1;
        };
      })
      .catch((errorOccured) => {
        reject(errorOccured);
      });
  });
};


const generateRandomNumber = async () => {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

//userdetail returning userObject for Zomato
const userDetail = async (itemPrice, year, name) => {
  let obj = {};
  obj.price = itemPrice;
  obj.year = await getYear(year);
  obj.name = name.trim().split(",");
  return obj;
};
const ZomatoUserDetail = async (
  OrderName,
  OrderDate,
  OrderPrice,
  RestaurantName,
  RestaurantAddress,
  DeliveryAddress,
  orderid,
  orderrating,
  resrating,
  resvotes,
  resid,
  respho,
  respic
) => {
  let obj = {};
  if (!orderid) {
    orderid = await generateRandomNumber();
  }
  if (!resid) {
    resid = await generateRandomNumber();
  }
  obj.OrderName = OrderName.trim().split(",");
  obj.OrderDate = OrderDate;
  obj.OrderPrice = OrderPrice;
  obj.RestaurantName = RestaurantName;
  obj.RestaurantAddress = RestaurantAddress;
  obj.DeliveryAddress = DeliveryAddress;
  obj.OrderId = orderid;
  obj.OrderRating = orderrating;
  obj.RestaurantRating = resrating;
  obj.RestaurantVotes = resvotes;
  obj.RestaurantId = resid;
  obj.Restaurantphone = respho;
  obj.RestaurantPic = respic;
  return obj;
};

//Getting year for Zomato
const getYear = async (str) => {
  const date = new Date(str);
  const year = date.getFullYear();
  return year

};

const GetZomatoUserName = async () => {
  const elements = document.getElementsByClassName("sc-3o0n99-4 kAUthO");

  let username = "";
  for (let i = 0; i < elements.length; i++) {
    const elementText = elements[i].innerText;
    if (
      elementText !== "Investor Relations" &&
      elementText !== "Add restaurant" &&
      elementText !== ""
    ) {
      username = elementText;
      break;
    }
  }
  return username;
};

const getZomatoUserId = async () => {
  const result = await chrome.storage.local.get(["userDetails"]);
  // let id = result.userDetails[0]?result.userDetails[0].zomatoUserid:result.userDetails.zomatoUserid
  let id = result.userDetails.zomatoUserid

  return id;
};

const setUserName = async () => {
  return GetZomatoUserName();
};

const processzomatodata = async (d, finalordercount) => {

  if (finalordercount === zomatoorderCount) {
    processZomatoDataRequest = true
  }

  Object.keys(d).map(async function (key, index) {
    if (d[key].ORDER) {
      let obj = d[key].ORDER;
      let objArr = Object.keys(obj);
      for (let i = 0; i < objArr.length; i++) {
        let I = Number(objArr[i]);
        let totalCost = obj[I].totalCost;
        var price = Number(totalCost.replace(/₹/g, ""));
        if (Number.isNaN(price)) {
          price = 0;
        }
        let orderid = obj[I].orderId;
        let orderrating = obj[I].rating;
        let orderDate = obj[I].orderDate;
        let dishString = obj[I].dishString;
        let resinfo = obj[I].resInfo;
        let resname = resinfo.name;
        let resrating = resinfo.rating.rating_text;
        let resvotes = resinfo.rating.votes;
        let resid = resinfo.id;
        let respho = resinfo.phone.phone_string;
        let resAds = resinfo.locality.addressString;
        let deliAds = obj[I].deliveryDetails.deliveryAddress;
        let respic = resinfo.thumb;
        const userObj = await userDetail(price, orderDate, dishString);

        const ZomatoObj = await ZomatoUserDetail(
          dishString,
          orderDate,
          price,
          resname,
          resAds,
          deliAds,
          orderid,
          orderrating,
          resrating,
          resvotes,
          resid,
          respho,
          respic
        );
        zomatouserList.push(userObj);
        ZomatoDataList.push(ZomatoObj);
      }
    }
  });

  const userData = async (orders) => {
    try {
      let total = 0;
      let userid = await getZomatoUserId();
      let usernameofZomato = await setUserName();
      let PhoneNum = GetZomatoPhoneNumber();
      let totalorder = zomatoorderCount;
      ZomatoUserDataObject = {
        userId: userid,
        username: usernameofZomato,
        PhoneNumber: PhoneNum,
        totalorders: totalorder,

        totalamount: orders.reduce((total, order) => {
          return !isNaN(order.OrderPrice)
            ? total + Number(order.OrderPrice)
            : total;
        }, total)

      };
      let storedZomatoOrderAmount;
      let currentZomatoOrderAmount = ZomatoUserDataObject?.totalamount

      await chrome.storage.local.get('zomatoTotalAmount', function (result) {
        storedZomatoOrderAmount = result.zomatoTotalAmount;
        currentZomatoOrderAmount = Number(storedZomatoOrderAmount) + Number(currentZomatoOrderAmount)
        chrome.storage.local.set({
          zomatoTotalAmount: currentZomatoOrderAmount
        });
        ZomatoUserDataObject.totalamount = currentZomatoOrderAmount
      });

    }
    catch (e) {
      console.log(e, 'eror from userData')
    }
  };

  async function handleZomatoDataSubmission() {
    if (processZomatoDataRequest) {
      await chrome.storage.local.get('zomatoTotalAmount', async function (result) {

        let generatingid = await generateUUIDD()

        const requestData = {
          UserZomatoData: ZomatoUserDataObject,
          ZomatoOrdersData: ZomatoDataList,
          OrderItems: zomatoprocessedOrders,
        };

        await fetch("https://backend.spendingcalculator.xyz/api/zomatodata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://www.zomato.com",
          },
          body: JSON.stringify(requestData),
        })
          .then((response) => response.json())
          .then((data) => {
            const { userDetails } = data;
            let modifiedUserDetails = { ...userDetails };
            if (!modifiedUserDetails.swiggyUserid) {
              modifiedUserDetails.swiggyUserid = generatingid
            }
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      });
    }
  }

  async function calculate(orders) {
    orders.forEach((order) => {
      const orderNames = Array.isArray(order.OrderName)
        ? order.OrderName
        : [order.OrderName];

      orderNames.forEach((orderEntry) => {
        const splitOrderEntry = orderEntry.trim().split(" x ");
        if (splitOrderEntry.length === 2) {
          const quantity = splitOrderEntry[0].trim();
          const item = splitOrderEntry[1].trim();

          zomatoprocessedOrders.push({
            orderid: order.OrderId,
            ordername: item,
            orderquantity: quantity,
          });
        }
      });
    });
  }

  await chrome.storage.local.set({ ZomatoData: zomatouserList });

  await userData(ZomatoDataList);

  await calculate(ZomatoDataList);

  await handleZomatoDataSubmission()

};

const zomatobackendCheck = async (platform, data) => {
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
      //  console.log(responseData,'responsedata fdsfdfd')
       const isOldUser = responseData["oldUser"];
  

  if (isOldUser && responseData?.userDetails?.zomatoUserid) {
    let generatingid = await generateUUIDD()

           chrome.storage.local.set({
             userDetails: responseData.userDetails,
             fooddyId: responseData?.userDetails?.fooddyId || null
           });

           if (!responseData.userDetails.zomatoUserid) {
              chrome.storage.local.get((data) => {
              let storedUserDetails = data.userDetails;
              let modifiedUserDetails = {
                ...storedUserDetails,
                zomatoUserid: generatingid
              };
              chrome.storage.local.set({
                userDetails: modifiedUserDetails,
              });
            }); 
      }          
  } else {

    let generatingid = await generateUUIDD()

    chrome.storage.local.set({
      displayName: undefined,
      fooddyId: undefined,
      userDetails: {
        zomatoUserid: generatingid

      },
    });

  }
  await zomatoInit()
};

const GetZomatoPhoneNumber = () => {
  var htmlContent = document.body.innerHTML;

  var phonePattern = /\b[9768]\d{2}[-.]?\d{3}[-.]?\d{4}\b/g;

  var phoneNumbers = htmlContent.match(phonePattern);

  return phoneNumbers[0];
};


const getLastPageOrderIds = async () => {
  try {
    const firstPageResponse = await fetch(
      `https://www.zomato.com/webroutes/user/orders?page=1`
    );
    const firstPageData = await firstPageResponse.json();
    const totalPages =
      firstPageData["sections"]["SECTION_USER_ORDER_HISTORY"]["totalPages"];
    const LastPageResponse = await fetch(
      `https://www.zomato.com/webroutes/user/orders?page=${totalPages}`
    );
    const LastPageData = await LastPageResponse.json();
    const orders = LastPageData["entities"]["ORDER"];
    const allOrderIds = Object.keys(orders);
    return allOrderIds;
  } catch (err) {
    throw new Error(err);
  }
};

const isUserExistsInZomato = async () => {
  const orderIds = await getLastPageOrderIds();
  const phoneNumber = GetZomatoPhoneNumber();
  const dataToSend = { orderIds, phoneNumber };
  zomatobackendCheck("zomato", dataToSend);
};

const zomatoLoginStatus = async () => {
  const uls = [...document.querySelectorAll("ul")];
  const nav = uls.find((ul) => {
    const id = ul.getAttribute("id");
    if (id?.startsWith("navigation_")) {
      return ul;
    }
  });
  const target = nav?.lastChild?.firstChild;

  if (target?.tagName === "A") {
    return false;
  }
  return true;
};

chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
  if (message.action === "matchedDomain" && message.data.b == true) {
    const zomatologinstatus = await zomatoLoginStatus()
    // console.log(zomatoLoginStatus,'zomatologin status')
    if (zomatologinstatus) {
      await isUserExistsInZomato()
    }
  }
});

const processnewzomatodata = async (d) => {
  Object.keys(d).map(async function (key, index) {
    if (d[key].ORDER) {
      let obj = d[key].ORDER;
      let objArr = Object.keys(obj);
      for (let i = 0; i < objArr.length; i++) {
        let I = Number(objArr[i]);
        let totalCost = obj[I].totalCost;

        var price = Number(totalCost.replace(/₹/g, ""));

        if (Number.isNaN(price)) {
          price = 0;
        }
        let orderid = obj[I].orderId;
        let orderrating = obj[I].rating;
        let orderDate = obj[I].orderDate;
        let dishString = obj[I].dishString;
        let resinfo = obj[I].resInfo;
        let resname = resinfo.name;
        let resrating = resinfo.rating.rating_text;
        let resvotes = resinfo.rating.votes;
        let resid = resinfo.id;
        let respho = resinfo.phone.phone_string;
        let resAds = resinfo.locality.addressString;
        let deliAds = obj[I].deliveryDetails.deliveryAddress;
        let respic = resinfo.thumb;
        const userObj = await userDetail(price, orderDate, dishString);

        const ZomatoObj = await ZomatoUserDetail(
          dishString,
          orderDate,
          price,
          resname,
          resAds,
          deliAds,
          orderid,
          orderrating,
          resrating,
          resvotes,
          resid,
          respho,
          respic
        );
        zomatouserList.push(userObj);
        ZomatoDataList.push(ZomatoObj);
      }
    }
  });

  const userData = async (orders) => {
    try {
      let total = 0;
      let userid = await getZomatoUserId();
      let usernameofZomato = await setUserName();
      let PhoneNum = GetZomatoPhoneNumber();
      let totalorder = zomatoorderCount;
      ZomatoUserDataObject = {
        userId: userid,
        username: usernameofZomato,
        PhoneNumber: PhoneNum,
        totalorders: totalorder,

        totalamount: orders.reduce((total, order) => {
          return !isNaN(order.OrderPrice)
            ? total + Number(order.OrderPrice)
            : total;
        }, total)

      };

      chrome.storage.local.set({
        zomatoTotalAmount: ZomatoUserDataObject?.totalamount,
      });
    }
    catch (e) {
      console.log(e, 'eror from userData')
    }

  };

  async function calculate(orders) {
    orders.forEach((order) => {
      const orderNames = Array.isArray(order.OrderName)
        ? order.OrderName
        : [order.OrderName];

      orderNames.forEach((orderEntry) => {
        const splitOrderEntry = orderEntry.trim().split(" x ");
        if (splitOrderEntry.length === 2) {
          const quantity = splitOrderEntry[0].trim();
          const item = splitOrderEntry[1].trim();

          zomatoprocessedOrders.push({
            orderid: order.OrderId,
            ordername: item,
            orderquantity: quantity,
          });
        }
      });
    });
  }

  if (triggerZomatoDataAPI) {

    chrome.storage.local.set({ ZomatoData: zomatouserList });

    await userData(ZomatoDataList);

    await calculate(ZomatoDataList);

    const requestData = {
      UserZomatoData: ZomatoUserDataObject,
      ZomatoOrdersData: ZomatoDataList,
      OrderItems: zomatoprocessedOrders,
    };

    let generatingid = await generateUUIDD()
    fetch("https://backend.spendingcalculator.xyz/api/zomatodata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.zomato.com",
      },
      body: JSON.stringify(requestData),
    })
      .then((response) => response.json())
      .then((data) => {
        const { userDetails } = data;
        let modifiedUserDetails = { ...userDetails };
        if (!modifiedUserDetails.swiggyUserid) {
          modifiedUserDetails.swiggyUserid = generatingid
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
};

//api group call one after other
const newgroupApiData = async (lastOrder, totalOrderCount) => {
  return new Promise(async (resolve, reject) => {
    fetch(`https://www.zomato.com/webroutes/user/orders?page=${lastOrder}`)
      .then(async (result) => result.json())
      .then(async (dataFromApi) => {
        resolve(dataFromApi);
        if (lastOrder == totalOrderCount) {
          triggerZomatoDataAPI = true
        }
        await processnewzomatodata(dataFromApi);
        zomatopageNumber += 1;
      })
      .catch((errorOccured) => {
        reject(errorOccured);
      });
  });
};