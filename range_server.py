import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, test

class RangeRequestHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        
        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None
        
        range_header = self.headers.get('Range')
        if not range_header:
            return super().send_head()
        
        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if not match:
            self.send_response(400, "Bad Request")
            self.end_headers()
            f.close()
            return None
        
        start, end = match.groups()
        try:
            start = int(start)
            if end:
                end = int(end)
            else:
                end = os.path.getsize(path) - 1
        except ValueError:
            self.send_response(400, "Bad Request")
            self.end_headers()
            f.close()
            return None
        
        size = os.path.getsize(path)
        if start >= size:
            self.send_response(416, "Requested Range Not Satisfiable")
            self.end_headers()
            f.close()
            return None
        
        self.send_response(206, "Partial Content")
        self.send_header('Content-type', ctype)
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        
        f.seek(start)
        return f

    def copyfile(self, source, outputfile):
        if not isinstance(source, bytes) and hasattr(self, 'headers') and self.headers.get('Range'):
            range_header = self.headers.get('Range')
            match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start, end = match.groups()
                start = int(start)
                if end:
                    end = int(end)
                else:
                    end = os.path.getsize(self.translate_path(self.path)) - 1
                bytes_to_read = end - start + 1
                
                buffer_size = 64 * 1024
                while bytes_to_read > 0:
                    chunk = source.read(min(buffer_size, bytes_to_read))
                    if not chunk:
                        break
                    outputfile.write(chunk)
                    bytes_to_read -= len(chunk)
                return
        super().copyfile(source, outputfile)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    test(HandlerClass=RangeRequestHandler, port=port)
