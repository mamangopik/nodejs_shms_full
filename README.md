# nodejs_shms_full
node app for simon batapa datalogger <br>
most assets like JS,CSS,Images is hosted localy from the data logger it self because most of operation is run without internet connection. 

# Move Database Data Directory Location

# 1. Stop the MySQL service
sudo systemctl stop mysql

# 2. Copy the existing MySQL data to the new location (replace {user} and {drive} with your actual paths)
sudo rsync -av /var/lib/mysql /media/{user}/{drive}

# 3. Backup the old MySQL data directory
sudo mv /var/lib/mysql /var/lib/mysql.bak

# 4. Edit the MySQL configuration file (mysqld.cnf) using a text editor (e.g., nano)
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Find the line that specifies "datadir" and update it to the new location
# datadir=/media/{user}/{drive}/mysql

# 5. Update AppArmor alias configuration to reflect the new data directory location
sudo nano /etc/apparmor.d/tunables/alias

# Edit the line to look like this
# alias /var/lib/mysql/ -> /media/{user}/{drive}/mysql/,

# 6. Restart the AppArmor service
sudo systemctl restart apparmor

# 7. Change ownership of the new MySQL data directory
sudo chown -R mysql:mysql /media/{user}/{drive}/mysql

# 8. Update permissions on the MySQL data directory
sudo chmod -R 700 /media/{user}/{drive}/mysql

# 9. Start the MySQL service
sudo systemctl start mysql
