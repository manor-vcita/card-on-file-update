const fs = require('fs');
const axios = require('axios').default;
const findDuplicates = require('array-find-duplicates');
let manorCards = require('./manor-cards.json');
// let tcards = require('./thryv-cards.json');
// const vcards = require('./vcita-cards.json');
// const finalCards = require('./finalCardList.json');
// const missingCards = require('./missingCards.json');
const businessesStatus = require('./businesses_status.json')
const manorDirToken = 'f22513a98e8e67bb8db6b8a23368abc2c11ed6983e85c7001c7a905a076ae012';
const thryvDirDoken = '{directory_token}'
const dirToken = thryvDirDoken;
// const failedToDelete = require('./failed_to_delete.json')
const toCreate = require('./to_create.json')

// Used for final report files
const deletedCards = [];
const deletedCardsFails = [];
const cardsCreated = [];
const cardsCreatedFails = [];

const reCreate = async () => {
  let i = 0;
  for (card of toCreate) {
    try {
      createCardRes = await createCard(card);
    }
    catch(error) {
      createCardRes = false;
      console.log(`Card ${card.card_uid} failed to be created - (${i})`);
      const err = axiosError(error);
      card.error = err;
      cardsCreatedFails.push(card);
      fs.writeFile('failed_to_create.json', JSON.stringify(cardsCreatedFails), err=> {});
      i++;
    }
    if (createCardRes) {
      i++;
      const cardRes = createCardRes.data.data.card;
      cardRes.old_payment_token_id = card.old_payment_token_id;
      cardRes.new_payment_token_id = card.new_payment_token_id;
      cardRes.old_customer_id = card.old_customer_id;
      cardRes.new_customer_id = card.new_customer_id;
      cardsCreated.push(cardRes);
      fs.writeFile('created.json', JSON.stringify(cardsCreated), err=> {});
      console.log(`Card ${cardRes.id} was created - (${i})`);
      if (i === toCreate.length) {
        printStats();
      }
    } else {
      if (i === toCreate.length) {
        printStats();
      }
    }
  }
}
  
const start = async (cards) => {
  let i = 0;
  for (card of cards) {
    // Delete card
    let isDeleted; 
    try {
      isDeleted = await deleteCard(card);
    }
    catch(error) {
      isDeleted = false;
      console.log(`Card ${card.card_uid} failed to be deleted  - (${i})`);
      const err = axiosError(error);
      card.error = err;
      deletedCardsFails.push(card);
      fs.writeFile('failed_to_delete.json', JSON.stringify(deletedCardsFails), err=> {});
      i++;
      if (i === cards.length) {
        printStats();
      }
    }

    if (isDeleted) {
      deletedCards.push(card);
      fs.writeFile('deleted.json', JSON.stringify(deletedCards), err=> {});
      console.log(`Deleted card id - ${card.card_uid} - (${i})`);
      // Create updated card
      try {
        createCardRes = await createCard(card);
        i++;
      }
      catch(error) {
        createCardRes = false;
        console.log(`Card ${card.card_uid} failed to be created - (${i})`);
        const err = axiosError(error);
        card.error = err;
        cardsCreatedFails.push(card);
        fs.writeFile('failed_to_create.json', JSON.stringify(cardsCreatedFails), err=> {});
        i++;
      }
      if (createCardRes) {
        const cardRes = createCardRes.data.data.card;
        cardRes.old_payment_token_id = card.old_payment_token_id;
        cardRes.new_payment_token_id = card.new_payment_token_id;
        cardRes.old_customer_id = card.old_customer_id;
        cardRes.new_customer_id = card.new_customer_id;
        cardsCreated.push(cardRes);
        fs.writeFile('created.json', JSON.stringify(cardsCreated), err=> {});
        console.log(`Card ${cardRes.id} was created - (${i})`);
        if (i === cards.length) {
          printStats();
        }
      } else {
        if (i === cards.length) {
          printStats();
        }
      }
    }
  }
};

const printStats = () => {
  console.log('Deleted cards: ', deletedCards.length)
  console.log('New cards: ', cardsCreated.length)
  console.log('Failed to delete: ', deletedCardsFails.length)
  console.log('Failed to create: ', cardsCreatedFails.length)
}

const axiosError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(error.response.status, ' - ', error.response.data);
    console.log(error.response.status);
    return error.response.data;
    // console.log(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log(error.request);
    return error.request;
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log('Error', error.message);
    return error.message;
  }
};



const deleteCard = (card) => {
  return axios.delete(`https://api2.vcita.com/platform/v1/payment/cards/${card.card_uid}`, {
    headers: {
      'Authorization': `Bearer ${dirToken}`,
      'X-On-Behalf-Of': card.business_uid 
    }
  });
};

const createCard = (card) => {
  const data = {
    client_id: card.client_id,
    customer_id: card.new_customer_id,
    details: {
      active: card.active,
      card_brand: card.card_brand,
      cardholder_name: card.cardholder_name,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      last_4: card.last_4,
      staff_id: card.staff_id
    },
    default: card.default,
    external_card_id: card.new_payment_token_id
  };
  const headers = {
    'Authorization': `Bearer ${dirToken}`,
    'X-On-Behalf-Of': card.business_uid,  
  }
  return axios({
    method: 'post',
    url: 'https://api.vcita.biz/platform/v1/payment/cards/sync_card',
    headers: headers,
    data: data
  });
};

const printCard = async () => {
  const card = await getCard(tcards[0]);
  console.log(card);
}


const getDuplicates = (array, property = false) => {
  let duplicates;
  if (property) {
    duplicates = findDuplicates(array, (a, b) => a[property] === b[property]);
  } else {
    duplicates = findDuplicates(array);
  }
  console.log(duplicates);
  return duplicates;
}

// Function for creating the final cards list
const createFinalCardsFile = () => {
  
  for (vcard of vcards) {
    const card = tcards.find((tcard) => {
      return tcard.old_payment_token_id === vcard.external_card_id;
    });
    card.card_uid = vcard.card_uid;
    card.last_4 = vcard.last_4;
    card.exp_month = vcard.exp_month;
    card.exp_year = vcard.exp_year;
    card.cardholder_name = vcard.cardholder_name;
    card.card_brand = vcard.card_brand;
    card.card_brand = vcard.card_brand;
    card.default = vcard.default === 1 ? true : false;
    card.active = vcard.active === 1 ? true : false;
    card.staff_id = vcard.staff_id;
    finalCards.push(card)
  };
  
  console.log(finalCards[0]);
  console.log(finalCards.length);
  fs.writeFile('finalCardList.json', JSON.stringify(finalCards), error => {error});
}

reCreate();

// start(finalCards);

// const businessUids = [];
// for (card of failedToDelete) {
//   if (!businessUids.includes(card.business_uid)) {
//     businessUids.push(card.business_uid);
//   }
// }
// console.log(businessUids);
// fs.writeFile('businesses.json', JSON.stringify(businessUids), error => {error});



// const statuses = [];
// for (card of failedToDelete) {
//   const business = businessesStatus.find(bus => bus.uid === card.business_uid);
//   card.payment_gateway = business.payments_gateway_type;
//   if (business.blocked_at !== 'NULL' || business.locked_at !== 'NULL') {
//     card.is_locked = true;
//   } else {
//     card.is_locked = false;
//   }
//   statuses.push(card);
// }
// fs.writeFile('statuses.json', JSON.stringify(statuses), error => {error});


// Comparing between two liasts and find missing entries
// const results = [];
// for (tcard of tcards) {
  //   const exist = finalCards.find(card => {
    //     return card.old_payment_token_id === tcard.old_payment_token_id;
    //   });
    //   if (!exist) {
      //     results.push(tcard.old_payment_token_id);
      //   }
      // };
      // console.log(results.length);
      // console.log(results);
// fs.writeFile('missingCards.json', JSON.stringify(results), err => {err});