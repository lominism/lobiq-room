"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { CalendarIcon, Users, Star, Wifi, Coffee, Car, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// SCRIPT CONFIG
const SCRIPT_URL = "YOUR_GOOGLE_WEB_APP_URL_HERE";

interface Room {
  id: number;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  image: string;
  capacity: number;
  amenities: string[];
  rating: number;
}

const rooms: Room[] = [
  {
    id: 1,
    name: "Garden Suite",
    description: "Cozy queen room with garden views",
    longDescription:
      "Wake up to the gentle sounds of nature in our charming Garden Suite. This thoughtfully appointed room features a plush queen-sized bed with premium linens, warm wood furnishings, and large windows overlooking our manicured gardens. Perfect for couples seeking a peaceful retreat.",
    price: 1490,
    image: "/images/garden-suite.jpg",
    capacity: 2,
    amenities: ["Free WiFi", "Breakfast included", "Garden view", "En-suite bathroom"],
    rating: 4.9,
  },
  {
    id: 2,
    name: "Sunset Room",
    description: "Romantic king suite with evening views",
    longDescription:
      "Experience the magic of golden hour from the comfort of our Sunset Room. This romantic retreat boasts a luxurious king-sized bed, an elegant exposed brick accent wall, and a vintage chandelier that sets the perfect ambiance. Watch the sky paint itself in warm hues each evening from your private sitting area.",
    price: 1890,
    image: "/images/sunset-room.jpg",
    capacity: 2,
    amenities: ["Free WiFi", "Breakfast included", "Sunset view", "Sitting area"],
    rating: 5.0,
  },
  {
    id: 3,
    name: "Coastal Retreat",
    description: "Breezy room with balcony access",
    longDescription:
      "Let the ocean breeze refresh your spirit in our Coastal Retreat. This light-filled haven features a comfortable king bed with coastal-inspired decor in soothing blues and whites. Step out onto your private balcony to enjoy morning coffee with stunning views. The perfect escape for those who find peace by the water.",
    price: 2190,
    image: "/images/coastal-retreat.jpg",
    capacity: 2,
    amenities: ["Free WiFi", "Breakfast included", "Private balcony", "Ocean view"],
    rating: 4.8,
  },
];

export default function BookingPage() {
  const router = useRouter();
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  );
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  // Booking states
  const [lineUserId, setLineUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [occupiedDatesList, setOccupiedDatesList] = useState<string[]>([]);

  const nights =
    checkInDate && checkOutDate
      ? differenceInDays(checkOutDate, checkInDate)
      : 0;

  // 1. Initialize LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        // @ts-ignore
        if (window.liff) {
          // @ts-ignore
          await window.liff.init({ liffId: "YOUR_ROOM_LIFF_ID_HERE" });
          // @ts-ignore
          if (window.liff.isLoggedIn()) {
            setIsLoggedIn(true);
            // @ts-ignore
            const profile = await window.liff.getProfile();
            setLineUserId(profile.userId);
            setUserName(profile.displayName);
          }
        }
      } catch (err) {
        console.error("LIFF failed", err);
      }
    };
    initLiff();
  }, []);

  // 2. Fetch occupied dates for the selected room
  useEffect(() => {
    const fetchOccupiedDates = async () => {
      if (!selectedRoom || !checkInDate) return;
      try {
        const year = checkInDate.getFullYear();
        const month = checkInDate.getMonth();
        
        const res = await fetch(`${SCRIPT_URL}?action=getOccupiedDates&room=${encodeURIComponent(selectedRoom.name)}&year=${year}&month=${month}`);
        if (!res.ok) return;
        const dates = await res.json();
        setOccupiedDatesList((prev) => [...new Set([...prev, ...dates])]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchOccupiedDates();
  }, [selectedRoom, checkInDate]);

  // 3. Handle Form Submission
  const handleBooking = async () => {
    setErrorMsg("");
    if (!isLoggedIn) {
      setErrorMsg("Please log in with LINE first.");
      return;
    }
    if (!userName || !userPhone) {
      setErrorMsg("Please fill in your name and phone number.");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setErrorMsg("Please select check-in and check-out dates.");
      return;
    }

    // Double check disabled dates
    let tempDate = new Date(checkInDate);
    tempDate.setHours(12,0,0,0);
    const end = new Date(checkOutDate);
    end.setHours(12,0,0,0);
    
    let isConflict = false;
    while(tempDate < end) {
        const tzOffset = tempDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(tempDate.getTime() - tzOffset)).toISOString().split('T')[0];
        
        if (occupiedDatesList.includes(localISOTime)) {
            isConflict = true;
            break;
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }

    if (isConflict) {
        setErrorMsg("Your selected dates include unavailable days.");
        return;
    }

    setIsSubmitting(true);
    
    // Format dates nicely
    const tzCheckIn = new Date(checkInDate.getTime() - checkInDate.getTimezoneOffset() * 60000);
    const tzCheckOut = new Date(checkOutDate.getTime() - checkOutDate.getTimezoneOffset() * 60000);
    const dateStr = `${tzCheckIn.toISOString().split('T')[0]} to ${tzCheckOut.toISOString().split('T')[0]}`;
    
    const payload = {
        name: userName,
        phone: userPhone,
        guests: guests,
        room: selectedRoom?.name,
        dates: dateStr,
        requests: "",
        lineUserId: lineUserId
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            router.push(`/success?details=${encodeURIComponent(data.details)}`);
        } else {
            setErrorMsg(data.error || "Booking failed");
        }
    } catch (e: any) {
        setErrorMsg("Error: " + e.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const isDateDisabled = (date: Date) => {
     const tzOffset = date.getTimezoneOffset() * 60000;
     const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().split('T')[0];
     
     const today = new Date();
     today.setHours(0,0,0,0);
     return date < today || occupiedDatesList.includes(localISOTime);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-xl text-primary">LobiQ Room</div>
          <div className="text-xs text-muted-foreground">
            Book anything. Anyplace. Anytime.
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-32">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Find your perfect stay
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLoggedIn && userName ? `Welcome back, ${userName}!` : "3 beautiful rooms available"}
          </p>
        </div>

        {/* Date Pickers */}
        <div className="flex gap-3 mb-6">
          {/* Check-in Date */}
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start text-left h-14 bg-card border-border"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-muted-foreground">Check-in</span>
                  <span className="font-medium text-foreground truncate">
                    {checkInDate ? format(checkInDate, "MMM d") : "Select"}
                  </span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={(date) => {
                  setCheckInDate(date);
                  setCheckInOpen(false);
                  if (date && checkOutDate && date >= checkOutDate) {
                    setCheckOutDate(new Date(date.getTime() + 24 * 60 * 60 * 1000));
                  }
                }}
                disabled={isDateDisabled}
                className="rounded-lg"
              />
            </PopoverContent>
          </Popover>

          {/* Check-out Date */}
          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-start text-left h-14 bg-card border-border"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-muted-foreground">Check-out</span>
                  <span className="font-medium text-foreground truncate">
                    {checkOutDate ? format(checkOutDate, "MMM d") : "Select"}
                  </span>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={(date) => {
                  setCheckOutDate(date);
                  setCheckOutOpen(false);
                }}
                disabled={(date) => {
                    const checkInTz = checkInDate ? new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000) : new Date();
                    return date < checkInTz || isDateDisabled(date);
                }}
                className="rounded-lg"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Nights indicator */}
        {nights > 0 && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              {nights} {nights === 1 ? "night" : "nights"} selected
            </span>
          </div>
        )}

        {/* Room Cards */}
        <div className="space-y-4">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform bg-card border-border"
              onClick={() => setSelectedRoom(room)}
            >
              <div className="relative h-48 bg-muted">
                {/* Fallback color or actual image if you have them in public/images */}
                <div className="absolute inset-0 bg-secondary/50 flex items-center justify-center text-muted-foreground">
                  <Image
                      src={room.image}
                      alt={room.name}
                      fill
                      className="object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span>Room Image</span>
                </div>
                <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-foreground">{room.rating}</span>
                </div>
              </div>
              <CardContent className="p-4 relative bg-card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{room.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {room.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">{room.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wifi className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Coffee className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-primary">
                      ฿{room.price}
                    </span>
                    <span className="text-sm text-muted-foreground">/night</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Room Detail Modal - Full Screen on Mobile */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={() => setSelectedRoom(null)}
            className="fixed top-4 right-4 z-50 bg-card/90 backdrop-blur-sm p-2 rounded-full shadow-lg"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>

          {/* Room Image */}
          <div className="relative h-64 w-full bg-muted">
            <Image
              src={selectedRoom.image}
              alt={selectedRoom.name}
              fill
              className="object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-foreground">
                {selectedRoom.rating}
              </span>
            </div>
          </div>

          {/* Room Details */}
          <div className="p-5 pb-32">
            <h2 className="text-2xl font-bold text-foreground">
              {selectedRoom.name}
            </h2>
            
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Up to {selectedRoom.capacity} guests</span>
            </div>

            <p className="text-muted-foreground mt-4 leading-relaxed">
              {selectedRoom.longDescription}
            </p>

            {/* Price Summary */}
            <div className="mt-6 p-4 bg-secondary rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">
                  ฿{selectedRoom.price} x {nights || 1}{" "}
                  {(nights || 1) === 1 ? "night" : "nights"}
                </span>
                <span className="font-medium text-foreground">
                  ฿{selectedRoom.price * (nights || 1)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">
                  ฿{selectedRoom.price * (nights || 1)}
                </span>
              </div>
            </div>

            {/* Booking Form */}
            <div className="mt-8 space-y-4">
              <h3 className="font-semibold text-foreground text-lg">Guest Details</h3>
              
              {!isLoggedIn && (
                <Button 
                  // @ts-ignore
                  onClick={() => { if (window.liff) window.liff.login(); }}
                  className="w-full bg-[#06C755] hover:bg-[#05a546] text-white"
                >
                  Log in with LINE to Book
                </Button>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={e => setUserName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
                <input 
                  type="tel" 
                  value={userPhone} 
                  onChange={e => setUserPhone(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                  placeholder="e.g. 0812345678"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Number of Guests</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedRoom.capacity}
                  value={guests} 
                  onChange={e => setGuests(parseInt(e.target.value))}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
                  {errorMsg}
                </div>
              )}
              
              <Button 
                onClick={handleBooking}
                disabled={isSubmitting}
                className="w-full h-14 mt-4 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-70"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
            
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      {!selectedRoom && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Starting from</p>
              <p className="text-lg font-bold text-primary">฿1490/night</p>
            </div>
            <Button className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              View All Rooms
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
