import datetime
from calendar import Calendar

cal = Calendar()
year = 2026
month = 2

print("Weekdays in Feb 2026:")
for day in cal.itermonthdays(year, month):
    if day != 0:
        d = datetime.date(year, month, day)
        if d.weekday() < 5:  # Monday=0, Friday=4
            print(d)