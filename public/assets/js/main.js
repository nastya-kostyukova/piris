'use strict';
/*eslint-disable no-undef*/
/*eslint-disable key-spacing*/
/*eslint-disable no-console*/

function checkStatus(response) {
    return new Promise((resolve, reject) => {
        if (response.status >= 200 && response.status < 300) {
            return resolve(response);
        }

        response.text().then((res) => {
            const error = new Error(res);
            error.response = response;
            reject(error);
        })
        .catch((e)=> console.log(e));
        return false;
    });
}

function sendPost(form, url, data) {
    return fetch(url, {
        method: 'post',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${$.cookie('token')}`,
        },
        body: JSON.stringify(data),
    })
    .then(checkStatus)
    .catch((error) => {
        console.log(error);
        const errorNode = document.getElementById('error');
        errorNode.innerHTML = error.message;
        errorNode.style.display = 'block';
        throw error;
    });
}

function sendGet(url) {
    return fetch(url, {
        method: 'get',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${window.authToken}`,
        },
    })
    .then(checkStatus)
    .catch((error) => {
        console.log(error);
        const errorNode = document.getElementById('error');
        errorNode.innerHTML = error.message;
        errorNode.style.display = 'block';
        throw error;
    });
}

function addClientHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            id: form.elements.id.value,
            surname: form.elements.surname.value,
            name: form.elements.name.value,
            patronymic: form.elements.patronymic.value,
            birthdate: form.elements.birthdate.value,
            sex: form.elements.sex.value,
            passport_series: form.elements.passport_series.value,
            passport_no: form.elements.passport_no.value,
            passport_issuer: form.elements.passport_issuer.value,
            passport_issue_date: form.elements.passport_issue_date.value,
            passport_id: form.elements.passport_id.value,
            birthplace: form.elements.birthplace.value,
            city: form.elements.city.value,
            address: form.elements.address.value,
            home_phonenumber: form.elements.home_phonenumber.value || null,
            mobile_phonenumber: form.elements.mobile_phonenumber.value || null,
            email: form.elements.email.value || null,
            residence: form.elements.residence.value,
            martial_status: form.elements.martial_status.value,
            citizenship: form.elements.citizenship.value,
            disability: form.elements.disability.value,
            monthly_income: form.elements.monthly_income.value || null,
            pensioner: form.elements.pensioner.checked,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/clients/add',
          dataToSend)
          //.then(response => response.json())
          .then(() => {
              setTimeout(() => {
                  window.location.href = '/clients';
              }, 500);
          });
    }, true);
}

function addDepositHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            id: form.elements.id.value,
            client: form.elements.client.value,
            type: form.elements.deposits_type.value,
            agreement_number: form.elements.agreement_number.value,
            start: form.elements.start.value,
            end: form.elements.end.value,
            init_sum: form.elements.init_sum.value,
            currency: form.elements.currency.value,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/deposits/add',
          dataToSend)
          //.then(response => response.json())
          .then(() => {
              setTimeout(() => {
                  window.location.href = '/deposits/cash';
              }, 500);
          });
    }, true);
}

function addCreditHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            id: form.elements.id.value,
            client: form.elements.client.value,
            type: form.elements.type.value,
            agreement_number: form.elements.agreement_number.value,
            start: form.elements.start.value,
            end: form.elements.end.value,
            sum: form.elements.init_sum.value,
            currency: form.elements.currency.value,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/credits/add',
          dataToSend)
          //.then(response => response.json())
          .then(() => {
              setTimeout(() => {
                  window.location.href = '/credits/cash';
              }, 500);
          });
    }, true);
}

function addGetMoneyHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            agreement: form.elements.agreement.value,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/deposits/give-money',
          dataToSend);
    }, true);
}

function creditLoginHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            id: form.elements.id.value,
            pin: form.elements.pin.value,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/credits/login',
          dataToSend)
        .then(response => response.json())
        .then((response) => {
            window.authToken = response.token;
            sendGet('/credits/account');
            $(`#close${form.elements.id.value}`).modal('hide');
            $.cookie('token', response.token, { path: '/credits', expires: 7 });
            window.location.href = '/credits/home';
        });
    }, true);
}

function getFromCashHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            id: form.elements.id.value,
            sum: form.elements.sum.value,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/deposits/fromCash',
          dataToSend);
    }, true);
}

function receivePercentHandler(form) {
    form.addEventListener('submit', (e) => {
        const dataToSend = {
            agreement: form.elements.agreement.value,
            client_current: form.elements.client_current.value,
            client_percent: form.elements.client_percent.value,
        };

        e.stopPropagation();
        e.preventDefault();
        sendPost(form, '/deposits/receive-percent',
          dataToSend);
    }, true);
}

document.addEventListener('DOMContentLoaded', () => {
    const addClientForm = document.getElementById('addClient');
    const addDepositForm = document.getElementById('addDeposit');
    const addCreditForm = document.getElementById('addCredit');
    const getMoney = document.getElementsByClassName('getMoney');
    const fromCash = document.getElementsByClassName('fromCash');
    const receivePercent = document.getElementsByClassName('receivePercent');
    const creditLogin = document.getElementsByClassName('creditLogin');

    if (addClientForm) addClientHandler(addClientForm);
    if (addDepositForm) addDepositHandler(addDepositForm);
    if (addCreditForm) addCreditHandler(addCreditForm);
    if (getMoney.length) {
        for(let i = 0; i < getMoney.length; i++) {
            addGetMoneyHandler(getMoney[i]);
        }
    }
    if (creditLogin.length) {
        for(let i = 0; i < creditLogin.length; i++) {
            creditLoginHandler(creditLogin[i]);
        }
    }
    if (fromCash.length) {
        for (let i = 0; i < fromCash.length; i++) {
            getFromCashHandler(fromCash[i]);
        }
    }
    if (receivePercent.length) {
        for (let i = 0; i < receivePercent.length; i++) {
            receivePercentHandler(receivePercent[i]);
        }
    }
});

function validateDate(nodeName, lessNow) {
    const value = document.getElementById(nodeName).value;
    const isValid = moment(value).isValid();
    const errorNode = document.getElementById('error');
    const comparison = (lessNow)
            ? !isValid || moment(value).toDate() > moment().toDate()
            : !isValid || moment(value).toDate() <= moment().toDate();

    if (comparison) {
        document.getElementById('add').disabled = true;
        document.getElementById(nodeName).style.border= '1px solid red';

        errorNode.innerHTML = 'Invalid date';
        errorNode.style.display = 'block';
    } else {
        document.getElementById('add').disabled = false;
        document.getElementById(nodeName).style.border = '1px solid #ccc';

        errorNode.innerHTML = '';
        errorNode.style.display = 'none';
    }
}

if (document.getElementById('date')) {
    document.getElementById('date').onchange = validateDate.bind(window, 'date', true);
}
if (document.getElementById('date1')) {
    document.getElementById('date1').onchange = validateDate.bind(window, 'date1', true);
}
if (document.getElementById('date2')) {
    document.getElementById('date2').onblur = validateDate.bind(window, 'date2', false);
}
// if (document.getElementById('date3')) {
//     document.getElementById('date3').onblur = validateDate.bind(window, 'date3', false);
// }
// if (document.getElementById('date4')) {
//     document.getElementById('date4').onblur = validateDate.bind(window, 'date4', false);
// }
