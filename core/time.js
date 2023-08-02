/*****
 * Copyright (c) 2017-2023 Kode Programming
 * https://github.com/KodeProgramming/kode/blob/main/LICENSE
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*****/


/*****
 * This Date class supercededs the standard js Date class for two reasons:
 * (a) we can force dates to supercede the new operator and use the framework
 * standard constructor call, mkDate(), and (b) the framewokr Date class is
 * maintaned as a date when converted to JSON and back again.  Plain old JSON
 * converts a date to a string and restores the string, NOT the data object.
*****/
register('', class Time extends Date {
    static mon = {symbol: Symbol('mon'), index: 1, weekend: false};
    static tue = {symbol: Symbol('tue'), index: 2, weekend: false};
    static wed = {symbol: Symbol('wed'), index: 3, weekend: false};
    static thu = {symbol: Symbol('thu'), index: 4, weekend: false};
    static fri = {symbol: Symbol('fri'), index: 5, weekend: false};
    static sat = {symbol: Symbol('sat'), index: 6, weekend: true };
    static sun = {symbol: Symbol('sun'), index: 0, weekend: true };
    static dowArray = [ Time.sun, Time.mon, Time.tue, Time.wed, Time.thu, Time.fri, Time.sat ];

    static jsMax =  8640000000000000;
    static jsMin = -8640000000000000;

    static kodeMax =  4000*365*24*60*60*1000;
    static kodeMin = -4000*365*24*60*60*1000;;
  
    static dowMap = (() => {
        let map = {};
        Time.dowArray.forEach(dow => map[dow.symbol] = dow);
        return map;
    })();

    constructor(...args) {
        if (args.length == 1) {
            if (args[0] === 'max') {
                super(Time.kodeMax);
            }
            else if (args[0] === 'min') {
                super(Time.kodeMin);
            }
            else {
                super(args[0]);
            }
        }
        else {
            super(...args);
        }
    }

    add(...args) {
        const units = [
            this.addYears,
            this.addMonths,
            this.addDays,
            this.addHours,
            this.addMinutes,
            this.addSeconds,
            this.addMilliseconds,
        ];

        for (let i = 0; i < args.length; i++) {
            Reflect.apply(units[i], this, [args[i]]);
        }

        return this;
    }

    addMilliseconds(milliseconds) {
        this.setUTCMilliseconds(this.getUTCMilliseconds() + milliseconds);
        return this;
    }

    addSeconds(seconds) {
        this.setUTCSeconds(this.getUTCSeconds() + seconds);
        return this;
    }

    addMinutes(minutes) {
        this.setUTCMinutes(this.getUTCMinutes() + minutes);
        return this;
    }

    addHours(hours) {
        this.setUTCHours(this.getUTCHours() + hours);
        return this;
    }

    addDays(days) {
        this.setUTCDate(this.getUTCDate() + days);
        return this;
    }

    addWeeks(weeks) {
        this.setUTCDate(this.getUTCDate() + 7*weeks);
        return this;
    }

    addMonths(months) {
        this.setUTCMonth(this.getUTCMonth() + months);
        return this;
    }

    addQuarters(quarters) {
        this.setUTCMonth(this.getUTCMonth() + 3*quarters);
        return this;
    }

    addYears(years) {
        this.setUTCFullYear(this.getUTCFullYear() + years);
        return this;
    }

    clone() {
        return mkTime(this.valueOf());
    }

    dayBegins() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
        );
    }

    dayEnds() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate() + 1,
        );
    }
  
    dayOfWeek(weekStart) {
        let sundayBasedDow = Time.dowArray[this.getUTCDay()];
  
        if (sundayBasedDow.index >= weekStart.index) {
            return Time.dowArray[sundayBasedDow.index - weekStart.index];
        }
        else {
            return Time.dowArray[7 + sundayBasedDow.index - weekStart.index];
        }
    }
  
    hourBegins() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
            this.getUTCHours(),
        );
    }
  
    hourEnds() {
        return mktime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
            this.getUTCHours() + 1,
        );
    }
 
    isEQ(arg) {
        return this.valueOf() == arg.valueOf();
    }

    isGE(arg) {
        return this.valueOf() >= arg.valueOf();
    }

    isGT(arg) {
        return this.valueOf() > date.valueOf();
    }

    isLE(arg) {
        return this.valueOf() <= arg.valueOf();
    }

    isLT(arg) {
        return this.valueOf() < arg.valueOf();
    }

    minuteBegins() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
            this.getUTCHours(),
            this.getUTCMinutes(),
        );
    }

    minuteEnds() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
            this.getUTCHours(),
            this.getUTCMinutes() + 1,
        );
    }

    monthBegins(weekStart) {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            1,
        );
    }

    monthEnds(weekStart) {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth() + 1,
            1,
        );
    }

    quarterBegins(weekStart) {
        return mkTime(
            this.getUTCFullYear(),
            this.quarterOfYear() * 3,
            1,
        );
    }

    quarterEnds(weekStart) {
        return this.quarterBegins().addMonths(3);
    }
  
    quarterOfYear(quarterOfYear, weekStart) {
        return Math.floor(this.getUTCMonth() / 3);
    }

    secondBegins() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
            this.getUTCHours(),
            this.getUTCMinutes(),
            this.getUTCSeconds(),
            0
        );
    }

    secondEnds() {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate(),
            this.getUTCHours(),
            this.getUTCMinutes(),
            this.getUTCSeconds() + 1,
            0
        );
    }

    toJsDateString(utc) {
        if (!utc) {
            return this.toISOString().substr(0, 10);
        }
        else {
            let local = mkTime(this).addMinutes(-Time.utcOffset());
            return local.toISOString().substr(0, 10);
        }
    }

    toJsDateTimeString(utc) {
        if (!utc) {
            return this.toISOString().substr(0, 16);
        }
        else {
            let local = mkTime(this).addMinutes(-Time.utcOffset());
            return local.toISOString().substr(0, 16);
        }
    }

    toJsTimeString(utc) {
        if (!utc) {
            return this.toISOString().substr(11, 5);
        }
        else {
            let local = mkTime(this).addMinutes(-Time.utcOffset());
            return local.toISOString().substr(11, 5);
        }
    }

    static utcOffset() {
        return (new Date()).getTimezoneOffset();
    }
      
    weekBegins(weekStart) {
        return mkTime(
            this.getUTCFullYear(),
            this.getUTCMonth(),
            this.getUTCDate() - this.dayOfWeek().index,
        );
    }
  
    weekEnds(weekStart) {
        return this.weekBegins().addDays(7);  
    }
  
    weekOfYear(weekOfYear, weekStart) {
        let thisWeekBegins = this.weekBegins();
        let thisYearBegins = new mkTime(thisWeekBegins.year(), 0, 1);
  
        let weekBegins = mkTime(
            this.YearBegins.date.getUTCFullYear(),
            this.YearBegins.date.getUTCMonth(),
            this.YearBegins.date.getUTCDate() + 7 - thisYearBegins.dayOfWeek().index,
        );

        for (var week = 0; weekBegins.isLT(thisWeekBegins); week++) {
            weekBegins.addWeeks(1);
        }

        return week;
    }

    yearBegins() {
        return mkTime(
            this.getUTCFullYear(),
            0,
            1,
        );
    }

    yearEnds() {
        return mkTime(
            this.getUTCFullYear() + 1,
            0,
            1,
        );
    }
});
