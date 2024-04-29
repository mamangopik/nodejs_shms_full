# nodejs_shms_full
node app for simon batapa datalogger <br>
most assets like JS,CSS,Images is hosted localy from the data logger it self because most of operation is run without internet connection. 
# stop mysql service
1. `$sudo systemctl stop mysql`
# backup database
2. `$sudo cp -r /var/lib/mysql /var/lib/mysql_.bak`
# copy database desired location
3. `$sudo rsync -av /var/lib/mysql /media/{user}/{drive}`
4. `$sudo cp -r /var/lib/mysql /media/{user}/{drive}`
# change mysql setup for data storage location
5. `$sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf`

edit line like "datadir=" to<br>

. . .<br>
datadir=/media/{user}/{drive}/mysql<br>
. . .<br>


6. `$sudo nano /etc/apparmor.d/tunables/alias`

edit line like "alias /var/lib/mysql/ -> /var/lib/mysql/" to<br>
. . .<br>
alias /var/lib/mysql/ -> /media/{user}/{drive}/mysql/,<br>
. . .<br>

7. `$sudo systemctl restart apparmor`
8. `$sudo chown -R mysql:mysql  /media/{user}/{drive}/mysql`
9. `$sudo chmod -R 777 /media/{user}/{drive}/mysql`
10. `$sudo systemctl start mysql`