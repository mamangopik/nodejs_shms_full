# nodejs_shms_full
node app for simon batapa datalogger <br>
most assets like JS,CSS,Images is hosted localy from the data logger it self because most of operation is run without internet connection. 

# move database datadir location
1. `$sudo systemctl stop mysql`
2. `$sudo rsync -av /var/lib/mysql /media/{user}/{drive}`
3. `$sudo mv /var/lib/mysql /var/lib/mysql.bak`  
4. `$sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf`

edit line like "datadir=" to<br>

. . .<br>
datadir=/media/{user}/{drive}/mysql<br>
. . .<br>


5. `$sudo nano /etc/apparmor.d/tunables/alias`

edit line like "alias /var/lib/mysql/ -> /var/lib/mysql/" to<br>
. . .<br>
alias /var/lib/mysql/ -> /media/{user}/{drive}/mysql/,<br>
. . .<br>

6. `$sudo systemctl restart apparmor`
7. `$sudo chown -R mysql:mysql  /media/{user}/{drive}/mysql`
8. `$chmod -R 700 /media/{user}/{drive}/mysql`
9. `$sudo systemctl start mysql`