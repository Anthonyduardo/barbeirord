const bookingForm = document.getElementById('bookingForm');
const serviceButtons = Array.from(document.querySelectorAll('#serviceOptions .service-option'));
const planButtons = Array.from(document.querySelectorAll('#planOptions .service-option'));
const summaryTitle = document.getElementById('summaryTitle');
const summaryPrice = document.getElementById('summaryPrice');
const clientName = document.getElementById('clientName');
const clientPhone = document.getElementById('clientPhone');
const serviceDate = document.getElementById('serviceDate');
const serviceTime = document.getElementById('serviceTime');
const blockedTimes = document.getElementById('blockedTimes');
const WHATSAPP_NUMBER = '5592981487302';
const STORAGE_KEY = 'barbeariaBookedSlots';
let selectedOption = {
  type: 'serviço',
  title: 'Corte degradê',
  price: '40',
  duration: 40
};

function updateSummary() {
  summaryTitle.textContent = selectedOption.title;
  summaryPrice.textContent = `R$ ${Number(selectedOption.price).toFixed(2)}`;
}

function clearActive(collection) {
  collection.forEach(button => button.classList.remove('active'));
}

function selectOption(button) {
  const type = button.dataset.type;
  if (type === 'serviço') {
    clearActive(serviceButtons);
    clearActive(planButtons);
  } else {
    clearActive(planButtons);
    clearActive(serviceButtons);
  }
  button.classList.add('active');
  selectedOption = {
    type: type,
    title: button.dataset.title,
    price: button.dataset.price,
    duration: Number(button.dataset.duration) || 30
  };
  updateSummary();
}

function loadBookedSlots() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

function saveBookedSlots(slots) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      times.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return times;
}

function setDateRestrictions() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;
  serviceDate.min = todayString;
  if (!serviceDate.value) {
    serviceDate.value = todayString;
  }
}

function isToday(dateString) {
  if (!dateString) return false;
  const [year, month, day] = dateString.split('-').map(Number);
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === day
  );
}

function getBlockedTimes(startTime, durationMinutes) {
  const [hour, minute] = startTime.split(':').map(Number);
  const startTotal = hour * 60 + minute;
  const endTotal = startTotal + (Number(durationMinutes) || 30);
  const blocked = [];
  for (let current = startTotal; current < endTotal; current += 30) {
    const blockedHour = Math.floor(current / 60);
    const blockedMinute = current % 60;
    blocked.push(`${String(blockedHour).padStart(2, '0')}:${String(blockedMinute).padStart(2, '0')}`);
  }
  return blocked;
}

function updateTimeOptions() {
  const selectedDate = serviceDate.value;
  const bookedSlots = loadBookedSlots();
  const disabled = bookedSlots[selectedDate] || [];
  const times = generateTimeOptions();
  const isSelectedDateToday = isToday(selectedDate);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  serviceTime.innerHTML = '';
  const availableTimes = times.filter(time => {
    if (!isSelectedDateToday) return true;
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute > currentMinutes;
  });

  if (!availableTimes.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Nenhum horário disponível para hoje';
    option.disabled = true;
    option.selected = true;
    serviceTime.appendChild(option);
  } else {
    availableTimes.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      if (disabled.includes(time)) {
        option.disabled = true;
        option.textContent = `${time} - indisponível`;
      }
      serviceTime.appendChild(option);
    });

    const firstAvailable = Array.from(serviceTime.options).find(opt => !opt.disabled);
    if (firstAvailable) {
      firstAvailable.selected = true;
    }
  }

  const futureBlocked = disabled.filter(time => {
    if (!isSelectedDateToday) return true;
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute > currentMinutes;
  });
  updateBlockedTimes(futureBlocked);
}

function updateBlockedTimes(disabled) {
  if (!disabled.length) {
    blockedTimes.textContent = 'Nenhum horário ocupado ainda.';
    return;
  }
  blockedTimes.textContent = disabled.join(' • ');
}

serviceButtons.forEach(button => {
  button.addEventListener('click', () => selectOption(button));
});

planButtons.forEach(button => {
  button.addEventListener('click', () => selectOption(button));
});

serviceDate.addEventListener('change', updateTimeOptions);

setDateRestrictions();

bookingForm.addEventListener('submit', event => {
  event.preventDefault();

  const name = clientName.value.trim();
  const phone = clientPhone.value.trim();
  const date = serviceDate.value;
  const time = serviceTime.value;

  if (!name || !phone || !date || !time) {
    alert('Por favor, preencha todos os campos antes de confirmar.');
    return;
  }

  const bookedSlots = loadBookedSlots();
  const disabled = bookedSlots[date] || [];

  if (disabled.includes(time)) {
    alert('Esse horário já está indisponível. Escolha outro horário.');
    return;
  }

  const blockedTimesForBooking = getBlockedTimes(time, selectedOption.duration);
  bookedSlots[date] = Array.from(new Set([...disabled, ...blockedTimesForBooking]));
  bookedSlots[date].sort();
  saveBookedSlots(bookedSlots);
  updateTimeOptions();

  const formattedDate = new Date(`${date}T${time}`);
  const dateString = formattedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const message = `Olá, sou ${name}. Gostaria de agendar ${selectedOption.type} ${selectedOption.title} para o dia ${dateString} às ${time}. Meu telefone é ${phone}.`;
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;

  window.open(whatsappUrl, '_blank');
});

updateSummary();
updateTimeOptions();
