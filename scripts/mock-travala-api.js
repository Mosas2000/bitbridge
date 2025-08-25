#!/usr/bin/env node

/**
 * Mock Travala API Integration for BitBridge MVP Testing
 * Simulates travel booking payments using sBTC through BitBridge
 */

const crypto = require('crypto');

class MockTravalaAPI {
    constructor() {
        this.bookings = new Map();
        this.hotels = this.generateMockHotels();
        this.flights = this.generateMockFlights();
    }

    // Generate mock hotel data
    generateMockHotels() {
        return [
            { id: 'hotel_001', name: 'Bitcoin Beach Resort', location: 'El Salvador', pricePerNight: 0.002 }, // 0.002 sBTC
            { id: 'hotel_002', name: 'Crypto Palace Hotel', location: 'Miami, FL', pricePerNight: 0.003 },
            { id: 'hotel_003', name: 'Blockchain Boutique', location: 'San Francisco, CA', pricePerNight: 0.0025 },
            { id: 'hotel_004', name: 'Satoshi Suites', location: 'Tokyo, Japan', pricePerNight: 0.0035 },
            { id: 'hotel_005', name: 'Lightning Lodge', location: 'Zurich, Switzerland', pricePerNight: 0.004 }
        ];
    }

    // Generate mock flight data
    generateMockFlights() {
        return [
            { id: 'flight_001', route: 'NYC-LAX', airline: 'Bitcoin Airways', price: 0.01 }, // 0.01 sBTC
            { id: 'flight_002', route: 'LAX-TOK', airline: 'Crypto Airlines', price: 0.015 },
            { id: 'flight_003', route: 'MIA-LON', airline: 'Satoshi Express', price: 0.012 },
            { id: 'flight_004', route: 'SFO-BER', airline: 'Lightning Air', price: 0.013 },
            { id: 'flight_005', route: 'TOK-SYD', airline: 'Blockchain Jets', price: 0.011 }
        ];
    }

    // Create a hotel booking
    async createHotelBooking(hotelId, nights, customerAddress, merchantAddress) {
        const hotel = this.hotels.find(h => h.id === hotelId);
        if (!hotel) {
            throw new Error('Hotel not found');
        }

        const bookingId = 'booking_' + crypto.randomBytes(8).toString('hex');
        const totalPrice = hotel.pricePerNight * nights;

        const booking = {
            id: bookingId,
            type: 'hotel',
            hotel: hotel,
            nights: nights,
            totalPrice: totalPrice,
            customerAddress: customerAddress,
            merchantAddress: merchantAddress,
            status: 'pending',
            createdAt: new Date().toISOString(),
            paymentId: null
        };

        this.bookings.set(bookingId, booking);
        
        console.log(`🏨 Hotel booking created: ${bookingId}`);
        console.log(`   Hotel: ${hotel.name} (${hotel.location})`);
        console.log(`   Nights: ${nights}, Total: ${totalPrice} sBTC`);
        
        return booking;
    }

    // Create a flight booking
    async createFlightBooking(flightId, passengers, customerAddress, merchantAddress) {
        const flight = this.flights.find(f => f.id === flightId);
        if (!flight) {
            throw new Error('Flight not found');
        }

        const bookingId = 'booking_' + crypto.randomBytes(8).toString('hex');
        const totalPrice = flight.price * passengers;

        const booking = {
            id: bookingId,
            type: 'flight',
            flight: flight,
            passengers: passengers,
            totalPrice: totalPrice,
            customerAddress: customerAddress,
            merchantAddress: merchantAddress,
            status: 'pending',
            createdAt: new Date().toISOString(),
            paymentId: null
        };

        this.bookings.set(bookingId, booking);
        
        console.log(`✈️  Flight booking created: ${bookingId}`);
        console.log(`   Flight: ${flight.route} (${flight.airline})`);
        console.log(`   Passengers: ${passengers}, Total: ${totalPrice} sBTC`);
        
        return booking;
    }

    // Confirm booking payment
    async confirmBookingPayment(bookingId, paymentId) {
        const booking = this.bookings.get(bookingId);
        if (!booking) {
            throw new Error('Booking not found');
        }

        booking.paymentId = paymentId;
        booking.status = 'confirmed';
        booking.confirmedAt = new Date().toISOString();

        console.log(`✅ Booking confirmed: ${bookingId} with payment ${paymentId}`);
        
        return booking;
    }

    // Get booking details
    getBooking(bookingId) {
        return this.bookings.get(bookingId);
    }

    // Get all bookings
    getAllBookings() {
        return Array.from(this.bookings.values());
    }

    // Generate random booking for testing
    generateRandomBooking(customerAddress, merchantAddress) {
        const isHotel = Math.random() > 0.5;
        
        if (isHotel) {
            const hotel = this.hotels[Math.floor(Math.random() * this.hotels.length)];
            const nights = Math.floor(Math.random() * 7) + 1; // 1-7 nights
            return this.createHotelBooking(hotel.id, nights, customerAddress, merchantAddress);
        } else {
            const flight = this.flights[Math.floor(Math.random() * this.flights.length)];
            const passengers = Math.floor(Math.random() * 4) + 1; // 1-4 passengers
            return this.createFlightBooking(flight.id, passengers, customerAddress, merchantAddress);
        }
    }

    // Get booking statistics
    getStats() {
        const bookings = this.getAllBookings();
        const totalBookings = bookings.length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const totalRevenue = bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + b.totalPrice, 0);

        return {
            totalBookings,
            confirmedBookings,
            pendingBookings: totalBookings - confirmedBookings,
            totalRevenue: totalRevenue.toFixed(8),
            conversionRate: totalBookings > 0 ? (confirmedBookings / totalBookings * 100).toFixed(2) : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockTravalaAPI;
}

// CLI usage
if (require.main === module) {
    const api = new MockTravalaAPI();
    
    console.log('🌍 Mock Travala API Started');
    console.log('Available Hotels:', api.hotels.length);
    console.log('Available Flights:', api.flights.length);
    
    // Demo booking
    const demoCustomer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const demoMerchant = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    api.generateRandomBooking(demoCustomer, demoMerchant)
        .then(booking => {
            console.log('\n📋 Demo booking created:');
            console.log(JSON.stringify(booking, null, 2));
        })
        .catch(console.error);
}
