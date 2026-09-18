export type AuctionState = 'For sale' | 'Live auction' | 'Coming soon';

export type Car = {
  id: string;
  brand: string;
  model: string;
  trim: string;
  year: number;
  price: number;
  mileage: string;
  engine: string;
  horsepower: number;
  transmission: string;
  fuel: string;
  drivetrain: string;
  bodyType: string;
  location: string;
  state: AuctionState;
  bids: number;
  endsIn: number;
  images: string[];
  has3d: boolean;
  description: string;
  features: string[];
};

const carImages = {
  aston: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Aston_Martin_V8_Vantage_Roadster_IMG_8846.jpg',
  porsche: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Porsche_992_Turbo_S_1X7A0413.jpg',
  ferrari: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Ferrari_Roma_IMG_9620.jpg',
  mercedes: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Mercedes-AMG_C192_1X7A0832.jpg',
  bmw: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/BMW_M4%2C_EMS_23%2C_Essen_%28P1170092%29.jpg',
  audi: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Audi_RS5%2C_Binz_%28P1090702%29.jpg',
  jaguar: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/2020_Jaguar_F-Type_Convertible_IMG_5821.jpg',
  bentley: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Bentley_Continental_GT_%284th_gen.%29_IMG_0556.jpg',
  taycan: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Porsche_Taycan_Sport_Turismo_GTS_1X7A0416.jpg',
  defender: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Land_Rover_Defender_110_Station_Wagon_2016_-_rear.jpg',
  lexus: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Lexus_LC.jpg',
};

export const cars: Car[] = [
  {
    id: 'aston-martin-vantage-2022', brand: 'Aston Martin', model: 'Vantage', trim: 'F1 Edition',
    year: 2022, price: 2_65_00_000, mileage: '8,420 km', engine: '4.0L V8 Twin Turbo', horsepower: 535,
    transmission: '8-speed automatic', fuel: 'Petrol', drivetrain: 'Rear-wheel drive', bodyType: 'Coupe',
    location: 'Mumbai, MH', state: 'For sale', bids: 0, endsIn: 0, has3d: true,
    images: [carImages.aston, carImages.aston, carImages.aston],
    description: 'A rare, sharply focused Vantage in its most expressive form. Finished in a deep mineral green with a hand-trimmed Obsidian interior, this F1 Edition has been cared for like a collector piece.',
    features: ['F1 Edition aero package', 'Carbon ceramic brakes', 'B&O premium audio', '360° camera', 'Sport exhaust', 'Panoramic roof'],
  },
  {
    id: 'porsche-911-carrera-2021', brand: 'Porsche', model: '911 Carrera S', trim: '992',
    year: 2021, price: 1_89_00_000, mileage: '14,180 km', engine: '3.0L Flat-Six Turbo', horsepower: 443,
    transmission: '8-speed PDK', fuel: 'Petrol', drivetrain: 'Rear-wheel drive', bodyType: 'Coupe',
    location: 'New Delhi, DL', state: 'Live auction', bids: 17, endsIn: 9_240, has3d: true,
    images: [carImages.porsche, carImages.porsche, carImages.porsche],
    description: 'The benchmark, distilled. A 992 Carrera S with the right options, one fastidious owner and an immaculate service history.',
    features: ['Sport Chrono package', 'PASM sports suspension', 'Burmester audio', 'Adaptive cruise control', 'Rear-axle steering'],
  },
  {
    id: 'ferrari-roma-2023', brand: 'Ferrari', model: 'Roma', trim: 'V8 GT',
    year: 2023, price: 3_85_00_000, mileage: '3,960 km', engine: '3.9L V8 Twin Turbo', horsepower: 612,
    transmission: '8-speed dual clutch', fuel: 'Petrol', drivetrain: 'Rear-wheel drive', bodyType: 'Grand Tourer',
    location: 'Bengaluru, KA', state: 'For sale', bids: 0, endsIn: 0, has3d: false,
    images: [carImages.ferrari, carImages.ferrari, carImages.ferrari],
    description: 'Elegant, understated and devastatingly quick. The Roma is the modern grand tourer for a driver who prefers a lower volume.',
    features: ['Manettino drive modes', 'Full LED headlights', 'Apple CarPlay', 'JBL audio', '20-inch forged wheels'],
  },
  {
    id: 'mercedes-amg-gt-2020', brand: 'Mercedes-AMG', model: 'GT R', trim: 'Coupe',
    year: 2020, price: 2_15_00_000, mileage: '11,620 km', engine: '4.0L V8 Biturbo', horsepower: 577,
    transmission: '7-speed DCT', fuel: 'Petrol', drivetrain: 'Rear-wheel drive', bodyType: 'Coupe',
    location: 'Pune, MH', state: 'Live auction', bids: 24, endsIn: 21_500, has3d: true,
    images: [carImages.mercedes, carImages.mercedes, carImages.mercedes],
    description: 'The green hell machine. A visceral GT R with ceramic brakes, performance exhaust and the kind of presence that stops traffic.',
    features: ['AMG Track Pace', 'Carbon fibre roof', 'Ceramic composite brakes', 'AMG performance seats', 'Race mode'],
  },
  {
    id: 'bmw-m4-competition-2022', brand: 'BMW', model: 'M4 Competition', trim: 'xDrive',
    year: 2022, price: 1_28_00_000, mileage: '19,850 km', engine: '3.0L TwinPower Turbo', horsepower: 503,
    transmission: '8-speed automatic', fuel: 'Petrol', drivetrain: 'All-wheel drive', bodyType: 'Coupe',
    location: 'Hyderabad, TS', state: 'For sale', bids: 0, endsIn: 0, has3d: false,
    images: [carImages.bmw, carImages.bmw, carImages.bmw],
    description: 'A high-spec M4 for the modern enthusiast: fast, usable and finished in a vivid Sao Paulo Yellow.',
    features: ['M Sport differential', 'Laserlight headlights', 'Harman Kardon audio', 'Head-up display', 'M carbon bucket seats'],
  },
  {
    id: 'audi-rs5-sportback-2021', brand: 'Audi', model: 'RS 5 Sportback', trim: 'TFSI quattro',
    year: 2021, price: 1_02_00_000, mileage: '24,460 km', engine: '2.9L V6 Twin Turbo', horsepower: 444,
    transmission: '8-speed tiptronic', fuel: 'Petrol', drivetrain: 'Quattro AWD', bodyType: 'Sportback',
    location: 'Chennai, TN', state: 'For sale', bids: 0, endsIn: 0, has3d: false,
    images: [carImages.audi, carImages.audi, carImages.audi],
    description: 'The discreet daily with a five-cylinder soundtrack in its bones. One of the most complete performance cars in the city.',
    features: ['RS sport exhaust', 'Matrix LED headlights', 'Virtual cockpit plus', 'Bang & Olufsen audio', 'Panoramic sunroof'],
  },
  {
    id: 'jaguar-f-type-r-2022', brand: 'Jaguar', model: 'F-TYPE R', trim: '575 AWD',
    year: 2022, price: 1_42_00_000, mileage: '12,300 km', engine: '5.0L Supercharged V8', horsepower: 567,
    transmission: '8-speed automatic', fuel: 'Petrol', drivetrain: 'All-wheel drive', bodyType: 'Convertible',
    location: 'Goa, GA', state: 'Coming soon', bids: 0, endsIn: 43_200, has3d: false,
    images: [carImages.jaguar, carImages.jaguar, carImages.jaguar],
    description: 'A charismatic V8 roadster with a soundtrack that makes every tunnel a destination. Arrival and inspection in progress.',
    features: ['Convertible roof', 'Active sports exhaust', 'Torque vectoring', 'Meridian surround audio', 'Heated performance seats'],
  },
  {
    id: 'bentley-continental-gt-2019', brand: 'Bentley', model: 'Continental GT', trim: 'W12 Mulliner',
    year: 2019, price: 1_74_00_000, mileage: '28,750 km', engine: '6.0L W12 Twin Turbo', horsepower: 626,
    transmission: '8-speed dual clutch', fuel: 'Petrol', drivetrain: 'All-wheel drive', bodyType: 'Grand Tourer',
    location: 'Mumbai, MH', state: 'For sale', bids: 0, endsIn: 0, has3d: false,
    images: [carImages.bentley, carImages.bentley, carImages.bentley],
    description: 'Hand-stitched indulgence with an effortless turn of speed. Mulliner details and a full Bentley service record.',
    features: ['Mulliner driving specification', 'Naim for Bentley audio', 'Rotating display', 'Massaging seats', 'All-wheel steering'],
  },
  {
    id: 'porsche-taycan-4s-2022', brand: 'Porsche', model: 'Taycan 4S', trim: 'Performance Battery Plus',
    year: 2022, price: 1_56_00_000, mileage: '9,190 km', engine: 'Dual electric motor', horsepower: 562,
    transmission: '2-speed automatic', fuel: 'Electric', drivetrain: 'All-wheel drive', bodyType: 'Sports Saloon',
    location: 'New Delhi, DL', state: 'For sale', bids: 0, endsIn: 0, has3d: true,
    images: [carImages.taycan, carImages.taycan, carImages.taycan],
    description: 'Silent speed, low-slung confidence. A Taycan 4S with the larger battery and an exceptional Glacier White interior.',
    features: ['Performance Battery Plus', 'Adaptive air suspension', 'Porsche InnoDrive', 'Panoramic roof', 'Bose surround audio'],
  },
  {
    id: 'land-rover-defender-v8-2021', brand: 'Land Rover', model: 'Defender 110', trim: 'V8',
    year: 2021, price: 1_35_00_000, mileage: '18,650 km', engine: '5.0L Supercharged V8', horsepower: 518,
    transmission: '8-speed automatic', fuel: 'Petrol', drivetrain: 'All-wheel drive', bodyType: 'SUV',
    location: 'Bengaluru, KA', state: 'For sale', bids: 0, endsIn: 0, has3d: false,
    images: [carImages.defender, carImages.defender, carImages.defender],
    description: 'A Defender with a proper pulse. Capable, beautifully specified and ready for the long way home.',
    features: ['Electronic air suspension', 'Meridian audio', 'Terrain Response 2', 'Sliding panoramic roof', 'Windsor leather'],
  },
  {
    id: 'lexus-lc500-2020', brand: 'Lexus', model: 'LC 500', trim: 'Luxury Coupe',
    year: 2020, price: 1_19_00_000, mileage: '16,780 km', engine: '5.0L Naturally Aspirated V8', horsepower: 471,
    transmission: '10-speed automatic', fuel: 'Petrol', drivetrain: 'Rear-wheel drive', bodyType: 'Coupe',
    location: 'Pune, MH', state: 'Coming soon', bids: 0, endsIn: 64_100, has3d: false,
    images: [carImages.lexus, carImages.lexus, carImages.lexus],
    description: 'A design object with a naturally aspirated heart. The LC 500 rewards a slower, more deliberate kind of driving.',
    features: ['Mark Levinson audio', 'Active rear spoiler', 'Adaptive variable suspension', 'Head-up display', 'Carbon roof'],
  },
];

export function formatPrice(price: number) {
  return `₹${(price / 1_00_00_000).toFixed(2)} Cr`;
}

export function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
}