-- Partner and Dhow files now upload straight from the browser to storage, so they can be bigger than the hosting request cap.
update storage.buckets set file_size_limit = 26214400 where id = 'internal-files';
